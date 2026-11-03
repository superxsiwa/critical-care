package cases

import (
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
	"slices"
	"sort"
	"strings"
	"testing"
	"time"
)

// The shared contract (contract/ at the repo root): the studio must reach the app's verdict on
// every example, with the same problem lines where the contract lists them.
const contractDir = "../../../../contract"

var fixedTime = time.Date(2026, 11, 3, 12, 0, 0, 0, time.UTC)

type verdict struct {
	File     string   `json:"file"`
	OK       bool     `json:"ok"`
	Beds     []int    `json:"beds"`
	Problem  string   `json:"problem"`
	Problems []string `json:"problems"`
	About    string   `json:"about"`
}

func loadVerdicts(t *testing.T) []verdict {
	t.Helper()
	data, err := os.ReadFile(filepath.Join(contractDir, "examples", "verdicts.json"))
	if err != nil {
		t.Fatal(err)
	}
	var vs []verdict
	if err := json.Unmarshal(data, &vs); err != nil {
		t.Fatal(err)
	}
	if len(vs) == 0 {
		t.Fatal("no verdicts")
	}
	return vs
}

func TestContractVerdicts(t *testing.T) {
	for _, v := range loadVerdicts(t) {
		t.Run(v.File, func(t *testing.T) {
			data, err := os.ReadFile(filepath.Join(contractDir, "examples", v.File))
			if err != nil {
				t.Fatal(err)
			}
			got := ReadFile(data, ImageExists)
			if v.OK {
				if !got.OK() {
					t.Fatalf("%s: refused, the app accepts it: %q", v.About, got.Problems)
				}
				var beds []int
				for _, c := range got.Cases {
					beds = append(beds, c.BedNum)
				}
				if !reflect.DeepEqual(beds, v.Beds) {
					t.Fatalf("beds %v, the contract says %v", beds, v.Beds)
				}
				return
			}
			if got.OK() {
				t.Fatalf("%s: accepted, the app refuses it", v.About)
			}
			if v.Problems != nil {
				if !slices.Equal(got.Problems, v.Problems) {
					t.Fatalf("problems differ from the app's:\n got  %q\n want %q", got.Problems, v.Problems)
				}
				return
			}
			if !slices.ContainsFunc(got.Problems, func(p string) bool { return strings.Contains(p, v.Problem) }) {
				t.Fatalf("no problem contains %q: %q", v.Problem, got.Problems)
			}
		})
	}
}

func TestEquipmentListMatchesTheApp(t *testing.T) {
	entries, err := os.ReadDir("../../../../mobile/assets/equipment")
	if err != nil {
		t.Fatal(err)
	}
	var names []string
	for _, e := range entries {
		if strings.HasSuffix(e.Name(), ".png") {
			names = append(names, e.Name())
		}
	}
	sort.Strings(names)
	if !slices.Equal(Equipment(), names) {
		t.Fatalf("equipment.txt is out of step with mobile/assets/equipment:\n got  %v\n want %v", Equipment(), names)
	}
	if !ImageExists("./assets/equipment/syringe.png") || ImageExists("./assets/equipment/nope.png") {
		t.Fatal("ImageExists does not follow the list")
	}
}

func TestShippedCasesAreAccepted(t *testing.T) {
	var all []json.RawMessage
	for n := 1; n <= 8; n++ {
		data, err := os.ReadFile(filepath.Join("../../../../mobile/assets/cases", "bed0"+string(rune('0'+n))+".json"))
		if err != nil {
			t.Fatal(err)
		}
		all = append(all, data)
	}
	pkg, err := WritePackage(all, fixedTime)
	if err != nil {
		t.Fatal(err)
	}
	got := ReadFile(pkg, ImageExists)
	if !got.OK() || len(got.Cases) != 8 {
		t.Fatalf("the 8 shipped cases as a package: %q", got.Problems)
	}
}

func TestBedNumFallback(t *testing.T) {
	for _, tc := range []struct {
		in   any
		want int
		ok   bool
	}{
		{json.Number("3"), 3, true}, {json.Number("3.0"), 3, true}, {json.Number("3.5"), 0, false},
		{json.Number("0"), 0, false}, {" 4 ", 4, true}, {"0x10", 16, true}, {"0x1b", 27, true},
		{"5.0", 5, true}, {"abc", 0, false}, {"Infinity", 0, false}, {"-2", 0, false}, {nil, 0, false},
	} {
		got, ok := bedNum(tc.in)
		if got != tc.want || ok != tc.ok {
			t.Errorf("bedNum(%#v) = %d, %v; want %d, %v", tc.in, got, ok, tc.want, tc.ok)
		}
	}
}
