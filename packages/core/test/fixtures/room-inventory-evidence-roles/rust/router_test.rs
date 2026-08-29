use crate::router::dispatch_route;

#[test]
fn dispatch_route_preserves_legacy_payload() {
    assert_eq!(dispatch_route("Home"), "legacy:home");
}
