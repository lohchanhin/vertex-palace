use crate::compatibility::preserve_legacy_route;
use crate::parser::decode_route_payload;

pub fn dispatch_route(payload: &str) -> String {
    preserve_legacy_route(&decode_route_payload(payload))
}
