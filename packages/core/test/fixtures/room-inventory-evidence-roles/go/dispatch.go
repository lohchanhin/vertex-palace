package dispatch

func DispatchOrder(payload string) string {
	parsed := ParseOrderPayload(payload)
	return NormalizeLegacyOrder(parsed)
}
