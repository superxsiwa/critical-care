package cases

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"unicode"
)

// StepsPerCase is the number of steps every case has (rules.dart stepsPerCase).
const StepsPerCase = 6

// Issue is one reason a case cannot be played as written.
type Issue struct {
	Path    string `json:"path"`
	Message string `json:"message"`
}

func (i Issue) String() string { return i.Path + ": " + i.Message }

// Validate checks that c can be played: every expected id exists in its pool, every tray step can
// be finished, each step has one task the game can show, the vitals read as numbers. A port of
// validateCase in case_validation.dart, in the same order. imageExists answers whether a pool
// item's img can be shown; nil skips that check.
func Validate(c Case, imageExists func(img string) bool) []Issue {
	issues := []Issue{}
	issue := func(path, message string) { issues = append(issues, Issue{path, message}) }

	if c.BedNum < 1 {
		issue("$.bedNum", "must be 1 or more")
	}
	notBlank(issue, "$.bedCode", c.BedCode)
	notBlank(issue, "$.patientName", c.PatientName)
	notBlank(issue, "$.caseTitle", c.CaseTitle)
	notBlank(issue, "$.dxBadge", c.DxBadge)
	notBlank(issue, "$.doctorName", c.DoctorName)

	if len(c.Stages) != StepsPerCase {
		issue("$.stageData", fmt.Sprintf("has %d steps, expected %d", len(c.Stages), StepsPerCase))
	}
	stageIDs := map[string]bool{}
	for i, s := range c.Stages {
		at := fmt.Sprintf("$.stageData[%d]", i)
		if stageIDs[s.ID] {
			issue(at+".id", fmt.Sprintf("step id %s is used twice", s.ID))
		}
		stageIDs[s.ID] = true
		notBlank(issue, at+".name", s.Name)
		notBlank(issue, at+".reading", s.Reading)
		notBlank(issue, at+".doctorSpeech", s.DoctorSpeech)
		checkVitals(issue, at+".vitals", s.Vitals)
		checkStage(issue, at, s, imageExists)
	}
	return issues
}

var (
	bpPattern   = regexp.MustCompile(`^\d{2,3}/\d{2,3}$`)
	spo2Pattern = regexp.MustCompile(`^\d{1,3}%$`)
)

func checkVitals(issue func(string, string), at string, v Vitals) {
	if v.HR <= 0 {
		issue(at+".hr", "must be above 0")
	}
	if v.MAP <= 0 {
		issue(at+".map", "must be above 0")
	}
	if !bpPattern.MatchString(v.BP) {
		issue(at+".bp", fmt.Sprintf("\"%s\" is not systolic/diastolic", v.BP))
	}
	if !spo2Pattern.MatchString(v.SpO2) || percent(v.SpO2) > 100 {
		issue(at+".spo2", fmt.Sprintf("\"%s\" is not a percentage", v.SpO2))
	}
}

func percent(s string) int {
	n, _ := strconv.Atoi(strings.ReplaceAll(s, "%", ""))
	return n
}

func checkStage(issue func(string, string), at string, s Stage, imageExists func(string) bool) {
	var poolTasks []string
	if s.Sequence != nil {
		poolTasks = append(poolTasks, "sequenceTask")
	}
	if s.Trays != nil {
		poolTasks = append(poolTasks, "traysTask")
	}
	if s.UnorderedDrop != nil {
		poolTasks = append(poolTasks, "unorderedDropTask")
	}
	if len(poolTasks) > 1 {
		issue(at, fmt.Sprintf("has %s; a step can show one of them", strings.Join(poolTasks, " and ")))
	}
	if len(poolTasks) == 0 && s.Choices == nil {
		issue(at, "has no task")
	}

	if t := s.Choices; t != nil {
		c := at + ".choices1toN"
		notBlank(issue, c+".prompt", t.Prompt)
		if len(t.Options) == 0 {
			issue(c+".options", "is empty")
		}
		ids := make([]string, len(t.Options))
		anyCorrect := false
		for i, o := range t.Options {
			ids[i] = o.ID
			anyCorrect = anyCorrect || o.Correct
		}
		unique(issue, c+".options", ids)
		if len(t.Options) > 0 && !anyCorrect {
			issue(c+".options", "has no correct option")
		}
	}

	if t := s.Sequence; t != nil {
		c := at + ".sequenceTask"
		pool := checkPool(issue, c+".pool", t.Pool, imageExists)
		if len(t.CorrectOrder) == 0 {
			issue(c+".correctOrder", "is empty")
		}
		unique(issue, c+".correctOrder", t.CorrectOrder)
		inPool(issue, c+".correctOrder", t.CorrectOrder, pool)
	}

	if t := s.Trays; t != nil {
		c := at + ".traysTask"
		pool := checkPool(issue, c+".pool", t.Pool, imageExists)
		if len(t.Trays) == 0 {
			issue(c+".trays", "is empty")
		}
		trayIDs := make([]string, len(t.Trays))
		for i, tray := range t.Trays {
			trayIDs[i] = tray.ID
		}
		unique(issue, c+".trays", trayIDs)
		var placed []string
		for i, tray := range t.Trays {
			key, expected := "expectedIds", tray.ExpectedIDs
			if t.Ordered {
				key, expected = "expectedOrder", tray.ExpectedOrder
			}
			if expected == nil {
				issue(fmt.Sprintf("%s.trays[%d]", c, i), "has no "+key)
				continue
			}
			inPool(issue, fmt.Sprintf("%s.trays[%d].%s", c, i, key), expected, pool)
			placed = append(placed, expected...)
		}
		unique(issue, c+".trays (all expected ids)", placed)
		// The step only checks once the pool is empty, so a card no tray expects can never be right.
		isPlaced := map[string]bool{}
		for _, id := range placed {
			isPlaced[id] = true
		}
		for _, id := range pool.ids {
			if !isPlaced[id] {
				issue(c+".pool", fmt.Sprintf("\"%s\" belongs in no tray, so the step cannot be passed", id))
			}
		}
	}

	if t := s.UnorderedDrop; t != nil {
		c := at + ".unorderedDropTask"
		pool := checkPool(issue, c+".pool", t.Pool, imageExists)
		if len(t.ExpectedIDs) == 0 {
			issue(c+".expectedIds", "is empty")
		}
		unique(issue, c+".expectedIds", t.ExpectedIDs)
		inPool(issue, c+".expectedIds", t.ExpectedIDs, pool)
	}
}

// isBlank is Dart's trim().isEmpty: Unicode white space and the byte order mark.
func isBlank(s string) bool {
	return strings.TrimFunc(s, func(r rune) bool { return unicode.IsSpace(r) || r == '\uFEFF' }) == ""
}

func notBlank(issue func(string, string), path, value string) {
	if isBlank(value) {
		issue(path, "is empty")
	}
}

// poolIDs keeps a pool's ids in their first-seen order, like Dart's insertion-ordered Set.
type poolIDs struct {
	ids []string
	has map[string]bool
}

func checkPool(issue func(string, string), at string, pool []PoolItem, imageExists func(string) bool) poolIDs {
	if len(pool) == 0 {
		issue(at, "is empty")
	}
	ids := make([]string, len(pool))
	for i, p := range pool {
		ids[i] = p.ID
	}
	unique(issue, at, ids)
	for i, item := range pool {
		if isBlank(item.Text) {
			issue(fmt.Sprintf("%s[%d].text", at, i), "is empty")
		}
		if item.Img != nil && imageExists != nil && !imageExists(*item.Img) {
			issue(fmt.Sprintf("%s[%d].img", at, i), fmt.Sprintf("\"%s\" is not a bundled image", *item.Img))
		}
	}
	out := poolIDs{has: map[string]bool{}}
	for _, id := range ids {
		if !out.has[id] {
			out.has[id] = true
			out.ids = append(out.ids, id)
		}
	}
	return out
}

func unique(issue func(string, string), at string, ids []string) {
	seen := map[string]bool{}
	for _, id := range ids {
		if seen[id] {
			issue(at, fmt.Sprintf("\"%s\" appears twice", id))
		}
		seen[id] = true
	}
}

func inPool(issue func(string, string), at string, ids []string, pool poolIDs) {
	for _, id := range ids {
		if !pool.has[id] {
			issue(at, fmt.Sprintf("\"%s\" is not in the pool", id))
		}
	}
}
