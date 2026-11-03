package cases

import (
	"bytes"
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"
	"time"
)

// The file names and layout versions (mobile/lib/game/file_formats.dart).
const (
	PackageFormat  = "critical-care-cases"
	PackageVersion = 1
	BackupFormat   = "critical-care-backup"
)

// ReadResult is a case file read like the app's readCaseFile: either every case, in bed order,
// with the JSON to keep, or the problems, one line each.
type ReadResult struct {
	Cases    []Case
	JSON     []map[string]any
	Problems []string
}

// OK reports whether the file was accepted.
func (r ReadResult) OK() bool { return len(r.Problems) == 0 }

func rejected(problems ...string) ReadResult { return ReadResult{Problems: problems} }

// ReadFile reads a case package (format, version, cases) or his older formats (a list of cases,
// or {"cases": [...]}), where a missing or unreadable bedNum takes the case's place in the list.
// Every case must parse and pass Validate; one bad case rejects the whole file.
func ReadFile(data []byte, imageExists func(img string) bool) ReadResult {
	data = bytes.TrimPrefix(data, []byte("\uFEFF"))
	decoded, err := Decode(data)
	if err != nil {
		return rejected("not JSON: " + err.Error())
	}
	if file, ok := decoded.(map[string]any); ok && file["format"] != nil {
		if problem := packageProblem(file); problem != "" {
			return rejected(problem)
		}
		if l, ok := file["cases"].([]any); ok && len(l) == 0 {
			return rejected("cases: expected at least one case")
		}
	}
	list := ListOf(decoded)
	if len(list) == 0 {
		return rejected(`expected a list of cases, or {"cases": [...]}`)
	}

	var problems []string
	type read struct {
		c    Case
		json map[string]any
	}
	var reads []read
	for i, item := range list {
		where := fmt.Sprintf("case %d", i+1)
		obj, ok := item.(map[string]any)
		if !ok {
			problems = append(problems, where+": expected an object")
			continue
		}
		withBed := make(map[string]any, len(obj)+1)
		for k, v := range obj {
			withBed[k] = v
		}
		if n, ok := bedNum(obj["bedNum"]); ok {
			withBed["bedNum"] = json.Number(strconv.Itoa(n))
		} else {
			withBed["bedNum"] = json.Number(strconv.Itoa(i + 1))
		}
		c, err := ParseCase(withBed)
		if err != nil {
			problems = append(problems, where+": "+err.Error())
			continue
		}
		for _, issue := range Validate(c, imageExists) {
			problems = append(problems, fmt.Sprintf("%s (bed %d): %s", where, c.BedNum, issue))
		}
		reads = append(reads, read{c, withBed})
	}
	seen := map[int]bool{}
	for _, r := range reads {
		if seen[r.c.BedNum] {
			problems = append(problems, fmt.Sprintf("bed %d is in the file twice", r.c.BedNum))
		}
		seen[r.c.BedNum] = true
	}
	if len(problems) > 0 {
		return ReadResult{Problems: problems}
	}
	sort.SliceStable(reads, func(a, b int) bool { return reads[a].c.BedNum < reads[b].c.BedNum })
	out := ReadResult{}
	for _, r := range reads {
		out.Cases = append(out.Cases, r.c)
		out.JSON = append(out.JSON, r.json)
	}
	return out
}

// ListOf picks the cases out of a decoded file: a list, or an object with a "cases" list; nil
// otherwise.
func ListOf(decoded any) []any {
	switch v := decoded.(type) {
	case []any:
		return v
	case map[string]any:
		if l, ok := v["cases"].([]any); ok {
			return l
		}
	}
	return nil
}

// packageProblem says why a file that names its format cannot be read as a case package, or "".
func packageProblem(file map[string]any) string {
	format := file["format"]
	if format == BackupFormat {
		return "this is a backup file, not a case file: restore it under the backup in settings"
	}
	if format != PackageFormat {
		return fmt.Sprintf(`not a case package (format "%v")`, format)
	}
	version, whole := wholeNumber(file["version"])
	if !whole || version < 1 {
		return "version: expected a whole number from 1, found " + show(file["version"])
	}
	if version > PackageVersion {
		return fmt.Sprintf("made by a newer Case Studio (package version %d, this app reads up to %d): update the app first",
			version, PackageVersion)
	}
	if _, ok := file["cases"].([]any); !ok {
		return "cases: expected a list of cases"
	}
	return ""
}

// wholeNumber is Dart's `version is int`: a JSON number written without a fraction or exponent.
func wholeNumber(v any) (int, bool) {
	n, ok := v.(json.Number)
	if !ok || strings.ContainsAny(string(n), ".eE") {
		return 0, false
	}
	i, err := n.Int64()
	return int(i), err == nil
}

func show(v any) string {
	switch x := v.(type) {
	case nil:
		return "nothing"
	case string:
		return `"` + x + `"`
	}
	return fmt.Sprint(v)
}

// bedNum is his `Number(c.bedNum) || i + 1`: a number or numeric text above zero, else not ok.
func bedNum(v any) (int, bool) {
	var f float64
	switch x := v.(type) {
	case json.Number:
		var err error
		if f, err = x.Float64(); err != nil {
			return 0, false
		}
	case string:
		n, ok := parseNum(strings.TrimSpace(x))
		if !ok {
			return 0, false
		}
		f = n
	default:
		return 0, false
	}
	if f <= 0 || f != math.Trunc(f) || math.IsInf(f, 0) {
		return 0, false
	}
	return int(f), true
}

// parseNum is Dart's num.tryParse for the texts a bed number can sensibly hold: a decimal or
// 0x hex whole number with an optional sign, or a decimal fraction (no Infinity, NaN or hex floats).
func parseNum(s string) (float64, bool) {
	if i, err := strconv.ParseInt(s, 10, 64); err == nil {
		return float64(i), true
	}
	sign, rest := "", s
	if strings.HasPrefix(rest, "-") || strings.HasPrefix(rest, "+") {
		sign, rest = rest[:1], rest[1:]
	}
	if strings.HasPrefix(rest, "0x") || strings.HasPrefix(rest, "0X") {
		if i, err := strconv.ParseInt(sign+rest[2:], 16, 64); err == nil && rest[2:] != "" && !strings.ContainsAny(rest[2:], "+-") {
			return float64(i), true
		}
		return 0, false
	}
	if strings.ContainsAny(strings.ToLower(s), "xpinfa_") {
		return 0, false
	}
	f, err := strconv.ParseFloat(s, 64)
	return f, err == nil
}

// WritePackage writes cases (each a case's JSON as kept) as a version 1 package, indented by two
// spaces like the app's own files.
func WritePackage(cases []json.RawMessage, exportedAt time.Time) ([]byte, error) {
	pkg := struct {
		Format     string            `json:"format"`
		Version    int               `json:"version"`
		ExportedAt string            `json:"exportedAt"`
		Cases      []json.RawMessage `json:"cases"`
	}{PackageFormat, PackageVersion, exportedAt.UTC().Format(time.RFC3339), cases}
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	enc.SetIndent("", "  ")
	if err := enc.Encode(pkg); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
