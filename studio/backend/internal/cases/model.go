// Package cases reads and checks Critical Care cases exactly as the app does. It is a port of
// mobile/lib/game/case_model.dart, case_validation.dart and case_import.dart: the same checks in the
// same order with the same problem texts, held to that by ../../../../contract/examples/verdicts.json.
// It never judges whether the clinical content is right; that is the clinical reviewer's call.
package cases

import (
	"bytes"
	"encoding/json"
	"fmt"
	"math"
)

// Case is one bed's case: the shape of BedCasePayload (backend/src/services/beds/types.ts).
type Case struct {
	BedNum      int
	BedCode     string
	PatientName string
	CaseTitle   string
	DxBadge     string
	DoctorName  string
	Stages      []Stage
}

// Stage is one of a case's 6 steps.
type Stage struct {
	ID            string // a number or text in the JSON, kept as text
	Name          string
	Reading       string
	DoctorSpeech  string
	Vitals        Vitals
	Choices       *ChoicesTask
	Sequence      *SequenceTask
	Trays         *TraysTask
	UnorderedDrop *UnorderedDropTask
}

type Vitals struct {
	HR   int
	BP   string
	SpO2 string
	MAP  int
}

type PoolItem struct {
	ID   string
	Text string
	Img  *string
}

type ChoiceOption struct {
	ID      string
	Text    string
	Correct bool
}

type ChoicesTask struct {
	Prompt  string
	Options []ChoiceOption
}

type SequenceTask struct {
	Prompt       string
	Pool         []PoolItem
	CorrectOrder []string
}

type Tray struct {
	ID            string
	ExpectedIDs   []string // nil when absent
	ExpectedOrder []string // nil when absent
}

type TraysTask struct {
	Ordered bool
	Prompt  string
	Trays   []Tray
	Pool    []PoolItem
}

type UnorderedDropTask struct {
	Prompt      string
	ExpectedIDs []string
	Pool        []PoolItem
}

// FormatError is a wrong type at Path, for example $.stageData[1].traysTask.trays[0].expectedIds.
// Like the app, reading stops at the first one.
type FormatError struct {
	Path    string
	Message string
}

func (e FormatError) Error() string { return e.Path + ": " + e.Message }

// Decode reads JSON the way the app does: numbers keep their text so 5 and 5.0 can be told
// apart from 5.5, and nothing else is converted.
func Decode(data []byte) (any, error) {
	var v any
	d := json.NewDecoder(bytes.NewReader(data))
	d.UseNumber()
	if err := d.Decode(&v); err != nil {
		return nil, err
	}
	if d.More() {
		return nil, fmt.Errorf("unexpected data after the JSON value")
	}
	return v, nil
}

// ParseCase reads one case (a decoded JSON object) with the app's type checks.
func ParseCase(v any) (c Case, err error) {
	defer func() {
		if r := recover(); r != nil {
			fe, ok := r.(FormatError)
			if !ok {
				panic(r)
			}
			err = fe
		}
	}()
	return reader{v, "$"}.bedCase(), nil
}

// reader reads one JSON value at path; a wrong type panics with a FormatError that ParseCase
// turns into its error, as the app's _Reader throws.
type reader struct {
	value any
	path  string
}

func (r reader) fail(message string) { panic(FormatError{r.path, message}) }

func (r reader) object() map[string]any {
	m, ok := r.value.(map[string]any)
	if !ok {
		r.fail("expected an object")
	}
	return m
}

func (r reader) has(key string) bool { return r.object()[key] != nil }

func (r reader) at(key string) reader { return reader{r.object()[key], r.path + "." + key} }

func (r reader) text() string {
	s, ok := r.value.(string)
	if !ok {
		r.fail("expected text")
	}
	return s
}

func (r reader) optText() *string {
	if r.value == nil {
		return nil
	}
	s := r.text()
	return &s
}

func (r reader) boolean() bool {
	b, ok := r.value.(bool)
	if !ok {
		r.fail("expected true or false")
	}
	return b
}

// integer accepts a whole number, also when written with a fraction of zero (5.0), as the app does.
func (r reader) integer() int {
	n, ok := r.value.(json.Number)
	if !ok {
		r.fail("expected a whole number")
	}
	if i, err := n.Int64(); err == nil {
		return int(i)
	}
	f, err := n.Float64()
	if err != nil || f != math.Trunc(f) || math.IsInf(f, 0) {
		r.fail("expected a whole number")
	}
	return int(f)
}

func (r reader) optInt() {
	if r.value != nil {
		r.integer()
	}
}

// idText reads a number or text (stage ids are number | string) as text.
func (r reader) idText() string {
	switch v := r.value.(type) {
	case string:
		return v
	case json.Number:
		return fmt.Sprint(r.integer())
	}
	r.fail("expected a number or text")
	return ""
}

func (r reader) list() []reader {
	l, ok := r.value.([]any)
	if !ok {
		r.fail("expected a list")
	}
	out := make([]reader, len(l))
	for i, v := range l {
		out[i] = reader{v, fmt.Sprintf("%s[%d]", r.path, i)}
	}
	return out
}

func (r reader) texts() []string {
	l := r.list()
	out := make([]string, len(l))
	for i, x := range l {
		out[i] = x.text()
	}
	return out
}

func (r reader) optTexts() []string {
	if r.value == nil {
		return nil
	}
	return r.texts()
}

// bedCase reads in the app's order (status is read first), so the first error found is the same.
func (r reader) bedCase() Case {
	status := r.at("status").text()
	c := Case{BedNum: r.at("bedNum").integer()}
	c.BedCode = r.at("bedCode").text()
	c.PatientName = r.at("patientName").text()
	r.at("patientAge").optInt()
	c.CaseTitle = r.at("caseTitle").text()
	c.DxBadge = r.at("dxBadge").text()
	if status != "stable" && status != "alert" && status != "critical" {
		r.at("status").fail("expected stable, alert or critical")
	}
	r.at("statusText").text()
	c.DoctorName = r.at("doctorName").text()
	r.at("doctorAvatar").text()
	r.at("stayDuration").optText()
	r.at("clinicalNote").optText()
	for _, s := range r.at("stageData").list() {
		c.Stages = append(c.Stages, s.stage())
	}
	return c
}

func (r reader) stage() Stage {
	s := Stage{ID: r.at("id").idText()}
	s.Name = r.at("name").text()
	r.at("mechanic").text()
	s.Reading = r.at("reading").text()
	s.DoctorSpeech = r.at("doctorSpeech").text()
	s.Vitals = r.at("vitals").vitals()
	if r.has("choices1toN") {
		t := r.at("choices1toN").choices()
		s.Choices = &t
	}
	if r.has("sequenceTask") {
		t := r.at("sequenceTask").sequence()
		s.Sequence = &t
	}
	if r.has("traysTask") {
		t := r.at("traysTask").trays()
		s.Trays = &t
	}
	if r.has("unorderedDropTask") {
		t := r.at("unorderedDropTask").unorderedDrop()
		s.UnorderedDrop = &t
	}
	return s
}

func (r reader) vitals() Vitals {
	v := Vitals{HR: r.at("hr").integer()}
	v.BP = r.at("bp").text()
	v.SpO2 = r.at("spo2").text()
	v.MAP = r.at("map").integer()
	return v
}

func (r reader) choices() ChoicesTask {
	t := ChoicesTask{Prompt: r.at("prompt").text(), Options: []ChoiceOption{}}
	for _, o := range r.at("options").list() {
		opt := ChoiceOption{ID: o.at("id").text()}
		opt.Text = o.at("text").text()
		opt.Correct = o.at("correct").boolean()
		t.Options = append(t.Options, opt)
	}
	return t
}

func (r reader) pool() []PoolItem {
	out := []PoolItem{}
	for _, p := range r.at("pool").list() {
		item := PoolItem{ID: p.at("id").text()}
		item.Text = p.at("text").text()
		item.Img = p.at("img").optText()
		out = append(out, item)
	}
	return out
}

func (r reader) sequence() SequenceTask {
	t := SequenceTask{Prompt: r.at("prompt").text()}
	t.Pool = r.pool()
	t.CorrectOrder = r.at("correctOrder").texts()
	return t
}

func (r reader) trays() TraysTask {
	t := TraysTask{Ordered: r.at("ordered").boolean()}
	t.Prompt = r.at("prompt").text()
	t.Trays = []Tray{}
	for _, x := range r.at("trays").list() {
		tray := Tray{ID: x.at("id").text()}
		x.at("name").text()
		x.at("sterile").boolean()
		tray.ExpectedIDs = x.at("expectedIds").optTexts()
		tray.ExpectedOrder = x.at("expectedOrder").optTexts()
		t.Trays = append(t.Trays, tray)
	}
	t.Pool = r.pool()
	return t
}

func (r reader) unorderedDrop() UnorderedDropTask {
	t := UnorderedDropTask{Prompt: r.at("prompt").text()}
	t.ExpectedIDs = r.at("expectedIds").texts()
	t.Pool = r.pool()
	return t
}
