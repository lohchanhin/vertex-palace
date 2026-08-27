package store

type Store struct{}

func (store *Store) Save(value string) bool {
    return value != ""
}
