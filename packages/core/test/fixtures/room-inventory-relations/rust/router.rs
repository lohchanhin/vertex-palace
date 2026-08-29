pub fn rust_prepare_route(task: &str) -> bool {
    !task.is_empty()
}

pub fn rust_build_route(task: &str) -> bool {
    rust_prepare_route(task)
}

pub fn rust_use_resolver(resolve: fn() -> bool) -> bool {
    resolve()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rust_builds_route() {
        assert!(rust_build_route("task"));
    }
}
