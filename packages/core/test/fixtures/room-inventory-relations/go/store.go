package store

func goPersistStore(value string) bool {
	return value != ""
}

func goBuildStore(value string) bool {
	return goPersistStore(value)
}

type GoStore struct{}

func (store *GoStore) Save(value string) bool {
	return value != ""
}

type GoPrimary struct{}

func (primary *GoPrimary) Resolve() bool {
	return true
}

type GoSecondary struct{}

func (secondary *GoSecondary) Resolve() bool {
	return false
}

func goUseResolver(resolve func() bool) bool {
	return resolve()
}
