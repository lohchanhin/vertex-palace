package dispatch

import "testing"

func TestDispatchOrderPreservesLegacyPayload(t *testing.T) {
	if DispatchOrder("item") != "legacy:item" {
		t.Fatal("legacy payload changed")
	}
}
