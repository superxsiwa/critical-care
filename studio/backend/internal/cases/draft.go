package cases

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strconv"
)

// CheckCase lists what keeps one case (a draft) from being exported: the first wrong type, as the
// app stops there, or every rule it breaks. Paths start at the case ($.stageData[0].vitals.hr).
func CheckCase(raw json.RawMessage) []Issue {
	v, err := Decode(raw)
	if err != nil {
		return []Issue{{"$", "not JSON: " + err.Error()}}
	}
	c, err := ParseCase(v)
	if err != nil {
		if fe, ok := err.(FormatError); ok {
			return []Issue{{fe.Path, fe.Message}}
		}
		return []Issue{{"$", err.Error()}}
	}
	return Validate(c, ImageExists)
}

// Summary reads what the draft list shows: the bed number (when it is a whole number above 0)
// and the title (when it is text).
func Summary(raw json.RawMessage) (bed *int, title string) {
	v, err := Decode(raw)
	if err != nil {
		return nil, ""
	}
	obj, _ := v.(map[string]any)
	if n, ok := bedNum(obj["bedNum"]); ok {
		bed = &n
	}
	title, _ = obj["caseTitle"].(string)
	return bed, title
}

// Unpack reads a file to import as drafts: a case package or his older formats, refused only for
// what the app refuses at file level (not JSON, a backup or unknown format, a newer version, no
// cases, an entry that is not an object). Each case keeps its JSON as written; a missing or
// unreadable bedNum gets its place in the list, as in the app.
func Unpack(data []byte) ([]json.RawMessage, string) {
	data = bytes.TrimPrefix(data, []byte("\uFEFF"))
	decoded, err := Decode(data)
	if err != nil {
		return nil, "not JSON: " + err.Error()
	}
	if file, ok := decoded.(map[string]any); ok && file["format"] != nil {
		if problem := packageProblem(file); problem != "" {
			return nil, problem
		}
	}
	list := ListOf(decoded)
	if len(list) == 0 {
		return nil, `expected a list of cases, or {"cases": [...]}`
	}
	// The cases again, as raw JSON, so each keeps its keys in the author's order.
	var raw struct {
		Cases []json.RawMessage `json:"cases"`
	}
	if bytes.HasPrefix(bytes.TrimSpace(data), []byte("[")) {
		if err := json.Unmarshal(data, &raw.Cases); err != nil {
			return nil, "not JSON: " + err.Error()
		}
	} else if err := json.Unmarshal(data, &raw); err != nil {
		return nil, "not JSON: " + err.Error()
	}
	out := make([]json.RawMessage, len(list))
	for i, item := range list {
		obj, ok := item.(map[string]any)
		if !ok {
			return nil, fmt.Sprintf("case %d: expected an object", i+1)
		}
		if _, ok := bedNum(obj["bedNum"]); ok {
			out[i] = raw.Cases[i]
			continue
		}
		obj["bedNum"] = json.Number(strconv.Itoa(i + 1))
		fixed, err := json.Marshal(obj)
		if err != nil {
			return nil, err.Error()
		}
		out[i] = fixed
	}
	return out, ""
}
