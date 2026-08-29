package dispatch

func NormalizeLegacyOrder(value string) string {
	return "legacy:" + value
}
