package store

import "testing"

func TestGoBuildStore(t *testing.T) {
	if !goBuildStore("ok") {
		t.Fatal("expected store build to succeed")
	}
}
