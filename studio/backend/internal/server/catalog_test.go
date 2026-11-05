package server_test

import (
	"bytes"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"

	"casestudio/internal/cases"
)

type equipment struct {
	ID                             int64
	File, NameTh, NameEn, Category string
	Version                        int64
	UpdatedAt, UpdatedBy           string
}

type article struct {
	ID                                int64
	Title, Category, Summary, Content string
	Version                           int64
	UpdatedAt, UpdatedBy              string
}

func entryOf(t *testing.T, list []equipment, file string) equipment {
	t.Helper()
	for _, e := range list {
		if e.File == file {
			return e
		}
	}
	t.Fatalf("no entry for %s", file)
	return equipment{}
}

// His page's built-in names come with the database, one per picture of the app, and stay its own
// pictures: a name for any other file is refused, and a picture has one name at most.
func TestEquipmentNamesTheAppsPicturesOnly(t *testing.T) {
	srv := studio(t)
	var list []equipment
	if code, body := call(t, srv, "GET", "/api/equipment", nil, &list); code != 200 {
		t.Fatalf("list: %d %s", code, body)
	}
	files := make([]string, len(list))
	for i, e := range list {
		files[i] = e.File
	}
	if !slices.Equal(files, cases.Equipment()) {
		t.Fatalf("seeded entries %v, want one per picture %v", files, cases.Equipment())
	}
	bp := entryOf(t, list, "bp_monitor.png")
	if bp.NameTh != "เครื่องวัดความดันโลหิต" || bp.NameEn != "Blood Pressure Monitor" || bp.Category != "การติดตามสัญญาณชีพ" ||
		bp.Version != 1 || bp.UpdatedAt != "2026-11-04T00:00:00Z" || bp.UpdatedBy != "" {
		t.Fatalf("seeded bp_monitor: %+v", bp)
	}

	var out refusal
	add := func(file string) (int, []byte) {
		return call(t, srv, "POST", "/api/equipment", map[string]any{"file": file, "nameTh": "ชื่อ", "nameEn": "", "category": "หมวด"}, &out)
	}
	for _, file := range []string{"nothing.png", "../syringe.png", "./assets/equipment/syringe.png", ""} {
		if code, _ := add(file); code != 422 || out.Code != "picture-unknown" {
			t.Errorf("add %q: %d %+v", file, code, out)
		}
	}
	if code, _ := add("syringe.png"); code != 409 || out.Code != "picture-taken" {
		t.Fatalf("add a picture that has a name: %d %+v", code, out)
	}

	syringe := entryOf(t, list, "syringe.png")
	if code, _ := call(t, srv, "DELETE", "/api/equipment/"+itoa(syringe.ID)+"?version=1", nil, nil); code != 204 {
		t.Fatalf("delete: %d", code)
	}
	var added equipment
	if code, body := call(t, srv, "POST", "/api/equipment",
		map[string]any{"file": "syringe.png", "nameTh": "  กระบอกฉีดยา 10 มล.  ", "nameEn": "Syringe 10 ml", "category": "ยาและหัตถการ"}, &added); code != 201 {
		t.Fatalf("add after delete: %d %s", code, body)
	}
	if added.ID == syringe.ID || added.NameTh != "กระบอกฉีดยา 10 มล." || added.Version != 1 || added.UpdatedBy != "Admin" ||
		added.UpdatedAt != "2026-11-03T12:00:00Z" {
		t.Fatalf("added: %+v (the deleted one was %d)", added, syringe.ID)
	}

	// A page still open on the deleted entry cannot save over the new one.
	change := func(id, version int64, nameTh string) (int, []byte) {
		return call(t, srv, "PUT", "/api/equipment/"+itoa(id), map[string]any{"version": version, "nameTh": nameTh, "nameEn": "x", "category": "y"}, &out)
	}
	if code, _ := change(syringe.ID, 1, "ไม่ควรบันทึก"); code != 404 || out.Code != "not-found" {
		t.Fatalf("change the deleted entry: %d %+v", code, out)
	}
	var changed equipment
	if code, body := call(t, srv, "PUT", "/api/equipment/"+itoa(bp.ID),
		map[string]any{"version": 1, "nameTh": "เครื่องวัดความดัน", "nameEn": "BP Monitor", "category": "การติดตามสัญญาณชีพ"}, &changed); code != 200 {
		t.Fatalf("change: %d %s", code, body)
	}
	if changed.Version != 2 || changed.NameTh != "เครื่องวัดความดัน" || changed.File != "bp_monitor.png" || changed.UpdatedBy != "Admin" {
		t.Fatalf("changed: %+v", changed)
	}
	if code, _ := change(bp.ID, 1, "ทับของคนอื่น"); code != 409 || out.Code != "stale" {
		t.Fatalf("change from an old version: %d %+v", code, out)
	}
	if code, _ := call(t, srv, "DELETE", "/api/equipment/"+itoa(bp.ID)+"?version=1", nil, &out); code != 409 || out.Code != "stale" {
		t.Fatalf("delete from an old version: %d %+v", code, out)
	}

	// The picture of an entry never changes; the names must be there and not too long.
	for _, c := range []struct {
		body any
		code string
	}{
		{map[string]any{"version": 2, "file": "syringe.png", "nameTh": "a", "nameEn": "", "category": "b"}, "bad-request"},
		{map[string]any{"nameTh": "a", "nameEn": "", "category": "b"}, "bad-request"},
		{map[string]any{"version": 2, "nameTh": "   ", "nameEn": "", "category": "b"}, "nameTh-blank"},
		{map[string]any{"version": 2, "nameTh": "a", "nameEn": "", "category": ""}, "category-blank"},
		{map[string]any{"version": 2, "nameTh": strings.Repeat("ก", 201), "nameEn": "", "category": "b"}, "too-long"},
	} {
		if code, _ := call(t, srv, "PUT", "/api/equipment/"+itoa(bp.ID), c.body, &out); code != 400 || out.Code != c.code {
			t.Errorf("%v: %d %+v, want 400 %s", c.body, code, out, c.code)
		}
	}
	if code, _ := call(t, srv, "DELETE", "/api/equipment/"+itoa(bp.ID), nil, &out); code != 400 {
		t.Errorf("delete without a version: %d %+v", code, out)
	}
	if code, _ := call(t, srv, "PUT", "/api/equipment/x", map[string]any{"version": 1}, &out); code != 404 {
		t.Errorf("a bad id: %d", code)
	}

	call(t, srv, "GET", "/api/equipment", nil, &list)
	if len(list) != 16 || entryOf(t, list, "bp_monitor.png").NameTh != "เครื่องวัดความดัน" || entryOf(t, list, "syringe.png").ID != added.ID {
		t.Fatalf("the list after the changes: %+v", list)
	}
}

func TestKnowledgeArticles(t *testing.T) {
	srv := studio(t)
	var list []article
	if code, body := call(t, srv, "GET", "/api/knowledge", nil, &list); code != 200 {
		t.Fatalf("list: %d %s", code, body)
	}
	if len(list) != 6 || list[0].Title != "โครงสร้างเคสมาตรฐาน 6 ขั้นตอนใน CCU" || list[4].Category != "สัญญาณชีพ" ||
		!strings.HasPrefix(list[4].Content, "MAP คำนวณจากสูตร (2*DBP + SBP) / 3") || list[5].Version != 1 || list[5].UpdatedBy != "" {
		t.Fatalf("seeded articles: %+v", list)
	}

	var a article
	in := map[string]any{"title": " การดูแลสายสวน ", "category": "หัตถการ", "summary": "สรุป", "content": "บรรทัด 1\nบรรทัด 2"}
	if code, body := call(t, srv, "POST", "/api/knowledge", in, &a); code != 201 {
		t.Fatalf("add: %d %s", code, body)
	}
	if a.ID != 7 || a.Title != "การดูแลสายสวน" || a.Content != "บรรทัด 1\nบรรทัด 2" || a.Version != 1 || a.UpdatedBy != "Admin" {
		t.Fatalf("added: %+v", a)
	}
	var out refusal
	in["version"] = 1
	in["title"] = "การดูแลสายสวนหลอดเลือด"
	if code, body := call(t, srv, "PUT", "/api/knowledge/7", in, &a); code != 200 || a.Version != 2 || a.Title != "การดูแลสายสวนหลอดเลือด" {
		t.Fatalf("change: %d %s", code, body)
	}
	if code, _ := call(t, srv, "PUT", "/api/knowledge/7", in, &out); code != 409 || out.Code != "stale" {
		t.Fatalf("change from an old version: %d %+v", code, out)
	}
	for _, c := range []struct {
		body map[string]any
		code string
	}{
		{map[string]any{"title": "", "category": "a", "summary": "", "content": ""}, "title-blank"},
		{map[string]any{"title": "a", "category": " ", "summary": "", "content": ""}, "category-blank"},
		{map[string]any{"title": "a", "category": "b", "summary": strings.Repeat("ก", 1001), "content": ""}, "too-long"},
		{map[string]any{"title": "a", "category": "b", "summary": "", "content": "", "id": 3}, "bad-request"},
	} {
		if code, _ := call(t, srv, "POST", "/api/knowledge", c.body, &out); code != 400 || out.Code != c.code {
			t.Errorf("%v: %d %+v, want 400 %s", c.body, code, out, c.code)
		}
	}
	if code, _ := call(t, srv, "DELETE", "/api/knowledge/7?version=2", nil, nil); code != 204 {
		t.Fatalf("delete: %d", code)
	}
	if code, _ := call(t, srv, "DELETE", "/api/knowledge/7?version=2", nil, &out); code != 404 || out.Code != "not-found" {
		t.Fatalf("delete again: %d %+v", code, out)
	}
	delete(in, "version")
	if call(t, srv, "POST", "/api/knowledge", in, &a); a.ID == 7 {
		t.Fatalf("a new article took the deleted article's id")
	}
}

// Equipment names and articles are the studio's own: the package is the drafts and nothing else,
// byte for byte the contract's round-trip file however the catalog changes.
func TestTheCatalogStaysOutOfThePackage(t *testing.T) {
	srv := studio(t)
	call(t, srv, "POST", "/api/import", fixture(t, "valid/minimal.json"), nil)
	var list []equipment
	call(t, srv, "GET", "/api/equipment", nil, &list)
	for _, e := range list {
		call(t, srv, "PUT", "/api/equipment/"+itoa(e.ID), map[string]any{"version": e.Version, "nameTh": "เปลี่ยน " + e.NameTh, "nameEn": e.NameEn, "category": "หมวดใหม่"}, nil)
	}
	call(t, srv, "POST", "/api/knowledge", map[string]any{"title": "บทความใหม่", "category": "หมวด", "summary": "", "content": "เนื้อหา"}, nil)
	code, pkg := call(t, srv, "GET", "/api/package", nil, nil)
	want, err := os.ReadFile(filepath.Join(contract, "examples", "valid", "studio-export.json"))
	if err != nil {
		t.Fatal(err)
	}
	if code != 200 || !bytes.Equal(pkg, want) {
		t.Fatalf("export with a changed catalog: %d\n%s", code, pkg)
	}
	if bytes.Contains(pkg, []byte("เปลี่ยน")) || bytes.Contains(pkg, []byte("บทความใหม่")) {
		t.Fatal("the catalog reached the package")
	}
}
