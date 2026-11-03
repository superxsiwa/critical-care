package cases

import (
	_ "embed"
	"regexp"
	"strings"
)

// equipmentList names the app's equipment pictures (mobile/assets/equipment), one per line;
// TestEquipmentListMatchesTheApp keeps it equal to that folder.
//
//go:embed equipment.txt
var equipmentList string

// Equipment is the sorted list of the app's equipment pictures, such as syringe.png.
func Equipment() []string { return strings.Fields(equipmentList) }

var equipmentPath = regexp.MustCompile(`(?:^|/)equipment/([a-z0-9_]+\.png)$`)

// ImageExists is the app's check for a pool item's img: a path ending in equipment/<name>.png
// where <name>.png is one of the app's pictures.
func ImageExists(img string) bool {
	m := equipmentPath.FindStringSubmatch(img)
	if m == nil {
		return false
	}
	for _, name := range Equipment() {
		if name == m[1] {
			return true
		}
	}
	return false
}
