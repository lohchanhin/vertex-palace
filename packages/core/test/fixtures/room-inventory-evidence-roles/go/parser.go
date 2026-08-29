package dispatch

import "strings"

func ParseOrderPayload(payload string) string {
	return strings.TrimSpace(payload)
}
