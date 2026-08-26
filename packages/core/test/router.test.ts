import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateRoute } from "../src/evaluation/evaluate-route";
import { indexPalace } from "../src/indexer/index-palace";
import { analyzeTask } from "../src/router/analyze-task";
import { classifyTask } from "../src/router/classify-task";
import { routePalace } from "../src/router/route-planner";
import { requestedRouteSurfaces } from "../src/router/route-scorer";
import { withFixture } from "./test-utils";

const RELEASE_TASK = "Release Vertex Palace 0.2.2 after fixing Adaptive Full Palace memory delivery, verify npm registry, Git tag, and public plugin MCP installation";

const RELEASE_CHANGED_FILES = [
  ".agents/plugins/marketplace.json",
  "BUILD_WEEK.md",
  "CHANGELOG.md",
  "README.md",
  "docs/research/ADAPTIVE_MEMORY_FIX_0_2_2.md",
  "package.json",
  "packages/cli/package.json",
  "packages/cli/src/index.ts",
  "packages/core/package.json",
  "packages/core/src/packer/context-packer.ts",
  "packages/core/src/router/mode-selector.ts",
  "packages/core/test/context.test.ts",
  "packages/core/test/mode-selector.test.ts",
  "packages/mcp/package.json",
  "packages/mcp/src/server.ts",
  "packages/shared/package.json",
  "plugins/vertex-palace/.codex-plugin/plugin.json",
  "plugins/vertex-palace/.mcp.json",
  "plugins/vertex-palace/mcp/server.cjs"
] as const;

describe("routePalace", () => {
  it("classifies retrospective evaluation tasks and preserves tenant entities", () => {
    const task = "overall evaluation retrospective score for client6-blogunlock BlogUnlock route confidence";
    const analysis = analyzeTask(task);

    expect(classifyTask(task)).toBe("evaluation");
    expect(analysis.keywords).toEqual(expect.arrayContaining(["retrospective", "memory", "client6-blogunlock", "client6blogunlock", "blogunlock"]));
    expect(analysis.entities).toEqual(expect.arrayContaining(["client6-blogunlock", "client6blogunlock", "blogunlock"]));
  });

  it("preserves explicit call identifiers even when their names are natural-language actions", () => {
    const analysis = analyzeTask("Add test to ensure Add()/Remove() works without reading events");

    expect(analysis.identifiers).toEqual(expect.arrayContaining(["Add", "Remove"]));
    expect(analysis.entities).toEqual(expect.arrayContaining(["add", "remove"]));
  });

  it("keeps evaluation-subsystem implementation distinct from evaluating the product", () => {
    expect(classifyTask(
      "Implement generated-artifact token estimates and evaluation regression tests in the parser, indexer, and router"
    )).toBe("feature");
    expect(classifyTask(
      "Build an evaluation report for changed-file coverage and confidence calibration"
    )).toBe("evaluation");
    expect(classifyTask("feat(complete): Index-aware ValueCompleter")).toBe("feature");
    expect(classifyTask("fix(router)!: preserve exact route identity")).toBe("bugfix");
    expect(classifyTask(
      "Calibrate route confidence policy in the planner with regression tests"
    )).toBe("refactor");
  });

  it("classifies a Codex usage reliability audit before its optimization wording", () => {
    const task = "分析所有可访问的 Codex 对话中 Vertex Palace 的真实使用状况，量化可靠性并提出优化方向";
    const analysis = analyzeTask(task);

    expect(classifyTask(task)).toBe("evaluation");
    expect(analysis.keywords).toEqual(expect.arrayContaining([
      "evaluation",
      "retrospective",
      "usage",
      "audit",
      "research",
      "docs",
      "evidence",
      "tooling"
    ]));
    expect(requestedRouteSurfaces(analysis)).toEqual(
      expect.arrayContaining(["tooling", "docs", "evidence"])
    );
  });

  it("keeps an object-first product change ahead of incidental evaluation nouns", () => {
    const task = "将 Vertex Palace 核心优化为证据闭环路由：补齐 meta evaluation tooling docs machine evidence 任务意图，分离 evidence sufficiency 与 context mode，统一 palace context 和 evaluate 的自适应 payload 计量，并增加回归测试";
    expect(classifyTask(task)).toBe("refactor");
    expect(requestedRouteSurfaces(analyzeTask(task))).toEqual(expect.arrayContaining([
      "implementation",
      "shared",
      "test"
    ]));
    expect(requestedRouteSurfaces(analyzeTask(task))).not.toEqual(expect.arrayContaining([
      "docs",
      "evidence",
      "tooling"
    ]));
    expect(classifyTask(
      "分析所有可访问的 Codex 对话中 Vertex Palace 的真实使用状况，量化可靠性并提出优化方向"
    )).toBe("evaluation");
    expect(classifyTask(
      "Please update the router implementation and evaluation tests to share adaptive payload accounting"
    )).toBe("refactor");

    const continuation = "继续优化 Vertex Palace：完成 Round 13 主体归属闭环修复后的回归审计、完整验证、研究证据与简体中文记录；保持比赛冻结，不提交、不推送、不发布。";
    const continuationAnalysis = analyzeTask(continuation);
    expect(continuationAnalysis.keywords).toEqual(expect.arrayContaining([
      "subject",
      "owner",
      "closure"
    ]));
    expect(requestedRouteSurfaces(continuationAnalysis)).toEqual(expect.arrayContaining([
      "implementation",
      "test",
      "docs",
      "evidence"
    ]));
    expect(requestedRouteSurfaces(continuationAnalysis)).not.toContain("config");

    const compositionalLifecycleTask = "修复研究生命周期任务的路由：保留编号阶段身份，区分比赛冻结约束与配置请求，识别研究证据和中英文报告产出，并让任务分析、路由评分、路由规划与回归验证形成完整闭环；记录 Round 13 自审证据和双语结果，只做本地修改测试，不提交、不推送、不发布。";
    const compositionalSurfaces = requestedRouteSurfaces(analyzeTask(compositionalLifecycleTask));
    expect(classifyTask(compositionalLifecycleTask)).toBe("bugfix");
    expect(compositionalSurfaces).toEqual(expect.arrayContaining([
      "implementation",
      "test",
      "docs",
      "evidence"
    ]));
    expect(compositionalSurfaces).not.toContain("config");

    const completedRepair = "完成 Vertex Palace Round 14 组合式研究生命周期路由修复：让任务分析、路由评分与路由规划形成完整闭环，并记录机器证据和中英文报告。";
    expect(classifyTask(completedRepair)).toBe("bugfix");
    expect(analyzeTask(completedRepair).keywords).toEqual(expect.arrayContaining([
      "bilingual",
      "localization"
    ]));
    expect(classifyTask("完成本轮研究评估报告并总结结果")).toBe("evaluation");
  });

  it("classifies bounded Allow and Support tasks while preserving dotted code identity", () => {
    const requestTask = "Support multiple cookie headers in `Request.cookies` (#3029)";
    const nameEmailTask = "Allow periods in unquoted `NameEmail` display names (#13206)";

    expect(classifyTask(requestTask)).toBe("feature");
    expect(classifyTask(nameEmailTask)).toBe("feature");
    expect(analyzeTask(requestTask).entities).toEqual(
      expect.arrayContaining(["request-cookies", "requestcookies"])
    );
    expect(analyzeTask(nameEmailTask).entities).toContain("nameemail");
    expect(analyzeTask(nameEmailTask).entities).not.toContain("allow");
    expect(analyzeTask(nameEmailTask).keywords).not.toContain("allow");
  });

  it("keeps a domain-level unknown value out of task-classification intent", () => {
    const analysis = analyzeTask("allow unknown collation name (#1604)");

    expect(classifyTask(analysis.raw)).toBe("feature");
    expect(analysis.keywords).toEqual(expect.arrayContaining(["collation", "name"]));
    expect(analysis.keywords).not.toEqual(expect.arrayContaining(["classify", "analyze", "task"]));
  });

  it("uses an exact diagnostic phrase as a behavior anchor without reclassifying the task", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        [
          "collations.go",
          "package protocol\nconst defaultCollationID = 45\nvar collations = map[string]byte{\"binary\": 63}\n"
        ],
        [
          "packets.go",
          `package protocol
type mysqlConn struct{}
func (mc *mysqlConn) writeHandshakeResponsePacket() (byte, error) {
    cname := "binary"
    collation, found := collations[cname]
    if !found { return 0, fmt.Errorf("unknown collation: %q", cname) }
    return collation, nil
}
`
        ],
        [
          "connection.go",
          "package protocol\nfunc (mc *mysqlConn) handleParams(cfg *Config) error { if cfg.Collation != \"\" { return nil }; return nil }\n"
        ],
        [
          "connector.go",
          "package protocol\nfunc Connect(mc *mysqlConn) error { if _, err := mc.writeHandshakeResponsePacket(); err != nil { return err }; return mc.handleParams(&Config{}) }\n"
        ],
        [
          "rows.go",
          "package protocol\ntype namedRow struct{}\nfunc buildNamedRow(mc *mysqlConn, cfg *Config) error { _ = cfg.Collation; if _, err := mc.writeHandshakeResponsePacket(); err != nil { return err }; return mc.handleParams(cfg) }\n"
        ],
        [
          "dsn.go",
          "package protocol\ntype Config struct { Collation string }\nfunc parseDSNParams(cfg *Config, value string) { cfg.Collation = value }\n"
        ],
        [
          "dsn_test.go",
          "package protocol\nfunc TestDSNUnsafeCollation(t *testing.T) { cfg := &Config{Collation: \"binary\"}; _ = cfg }\n"
        ],
        [
          "driver_test.go",
          "package protocol\nfunc TestConnectionName(t *testing.T) { name := \"generic\"; _ = name }\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        await writeFile(path.join(root, relativePath), source, "utf8");
      }
      await indexPalace(root);

      const route = await routePalace(
        root,
        "allow unknown collation name (#1604)",
        { routeLimit: 6, budget: 6000 }
      );
      const filesOnly = route.route.map((step) => step.sourcePath.replace(/:\d+(?:-\d+)?$/, ""));

      expect(route.taskType).toBe("feature");
      expect(filesOnly).toEqual(expect.arrayContaining([
        "collations.go",
        "connection.go",
        "connector.go",
        "dsn.go",
        "dsn_test.go",
        "packets.go"
      ]));
      expect(filesOnly).not.toContain("driver_test.go");
      expect(filesOnly).not.toContain("rows.go");
    });
  });

  it("keeps a leading task-named module with its mirrored regression test", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        [
          "src/Lazy.ts",
          "export default class Lazy { constructor(private builder: () => any) {} private _resolve() { const schema = this.builder(); if (!schema) throw new TypeError('lazy builder must return a schema'); return schema.resolve(); } validate() { return this._resolve().validate(); } }\n"
        ],
        [
          "src/ValidationError.ts",
          "export default class ValidationError extends Error { static isError(error: unknown) { return error instanceof ValidationError; } }\n"
        ],
        [
          "src/schema.ts",
          "import ValidationError from './ValidationError';\nexport function validate() { throw new ValidationError('validation failed'); }\n"
        ],
        [
          "src/index.ts",
          "export {default as Lazy} from './Lazy';\nexport {default as ValidationError} from './ValidationError';\n"
        ],
        [
          "test/lazy.ts",
          "import {Lazy} from '../src';\ndescribe('lazy', () => { it('should throw on a non-schema value', () => { const lazy = new Lazy(() => null); expect(() => lazy.validate()).toThrow(); }); });\n"
        ],
        [
          "test/ValidationError.ts",
          "import {ValidationError} from '../src';\ndescribe('ValidationError', () => { it('identifies validation errors', () => expect(ValidationError.isError(new ValidationError('bad'))).toBe(true)); });\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const route = await routePalace(
        root,
        "fix: lazy validation errors thrown in builders should resolve async like other validations",
        { routeLimit: 8, budget: 6000 }
      );
      const filesOnly = route.route.map((step) => step.sourcePath.replace(/:\d+(?:-\d+)?$/, ""));

      expect(filesOnly).toEqual(expect.arrayContaining(["src/Lazy.ts", "test/lazy.ts"]));
      expect(filesOnly[0]).toBe("src/Lazy.ts");
    });
  });

  it("keeps an explicit method owner with its mirrored integration test ahead of a keyword-heavy sibling test", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        [
          "derived_types.go",
          "package pgx\ntype Conn struct{}\ntype ArrayCodec struct{}\nfunc (c *Conn) LoadTypes(names []string) error { _ = &ArrayCodec{}; return nil }\n"
        ],
        [
          "derived_types_test.go",
          "package pgx_test\nfunc TestCompositeCodecTranscodeWithLoadTypes(t *testing.T) { conn := &Conn{}; _ = conn.LoadTypes([]string{\"dtype_test\"}) }\n"
        ],
        [
          "pgtype/array_codec.go",
          "package pgtype\ntype ArrayCodec struct{}\n"
        ],
        [
          "pgtype/array_codec_test.go",
          "package pgtype_test\nfunc TestArrayCodecNamedSliceType(t *testing.T) { type namedStringSlice []string; _ = namedStringSlice{} }\nfunc TestArrayCodecAnyArray(t *testing.T) { type point3 [3]float32; _ = point3{} }\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const route = await routePalace(
        root,
        "Fix LoadTypes overwriting box/point codecs with a bogus ArrayCodec",
        { routeLimit: 10, budget: 6000 }
      );
      const filesOnly = route.route.map((step) => step.sourcePath.replace(/:\d+(?:-\d+)?$/, ""));

      expect(filesOnly).toEqual(expect.arrayContaining([
        "derived_types.go",
        "derived_types_test.go"
      ]));
      expect(filesOnly).not.toContain("pgtype/array_codec_test.go");
    });
  });

  it("does not duplicate verification for an indirect consumer of an explicit dotted owner", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        [
          "src/marshmallow/validate.py",
          "class URL:\n    def __call__(self, value):\n        return value.encode('idna')\n"
        ],
        [
          "tests/test_validate.py",
          "from marshmallow import validate\ndef test_url_accepts_idn():\n    assert validate.URL()('https://example.test')\n"
        ],
        [
          "src/marshmallow/fields.py",
          "from marshmallow import validate\nclass Url:\n    def __init__(self):\n        self.validate = validate.URL()\n"
        ],
        [
          "tests/test_fields.py",
          "from marshmallow.fields import Url\ndef test_url_field_validation():\n    assert Url().validate('https://example.test')\n"
        ],
        [
          "CHANGELOG.rst",
          "Changes\n=======\n\nUnreleased\n----------\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const route = await routePalace(
        root,
        "Add support for IDNs to validate.URL (#2928)",
        { routeLimit: 10, budget: 6000 }
      );
      const filesOnly = route.route.map((step) => step.sourcePath.replace(/:\d+(?:-\d+)?$/, ""));

      expect(filesOnly).toEqual(expect.arrayContaining([
        "src/marshmallow/validate.py",
        "tests/test_validate.py",
        "CHANGELOG.rst"
      ]));
      expect(filesOnly).not.toContain("tests/test_fields.py");
      expect(filesOnly.length).toBeLessThanOrEqual(4);
    });
  });

  it("closes an explicit member task through the member owner and that owner's mirrored test", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        [
          "src/createStore.ts",
          "import type { Store } from './types/store';\nexport function createStore(reducer: Function): Store {\n  function replaceReducer(nextReducer: Function) {\n    if (typeof nextReducer !== 'function') throw new Error('Expected the nextReducer to be a function.');\n    reducer = nextReducer;\n  }\n  return { replaceReducer };\n}\n"
        ],
        [
          "test/createStore.spec.ts",
          "import { createStore } from '../src/createStore';\ndescribe('createStore', () => it('validates replacement reducers', () => createStore(() => null).replaceReducer(null as any)));\n"
        ],
        [
          "src/types/store.ts",
          "export interface Store { replaceReducer(nextReducer: Function): void }\n"
        ],
        [
          "src/utils/formatProdErrorMessage.ts",
          "export function formatProdErrorMessage(code: number) { return `Minified Redux error #${code}; see the full message`; }\n"
        ],
        [
          "test/utils/formatProdErrorMessage.spec.ts",
          "import { formatProdErrorMessage } from '../../src/utils/formatProdErrorMessage';\nit('returns the expected error message', () => formatProdErrorMessage(10));\n"
        ],
        [
          "src/combineReducers.ts",
          "export function combineReducers(reducers: object) { const missingReducerError = 'missing reducer error message'; return { reducers, missingReducerError }; }\n"
        ],
        [
          "test/combineReducers.spec.ts",
          "import { combineReducers } from '../src/combineReducers';\ndescribe('combineReducers error messages', () => it('reports a missing closing quote for a reducer error message', () => combineReducers({})));\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const route = await routePalace(
        root,
        "fix: add missing closing quote in replaceReducer error message",
        { routeLimit: 4, budget: 6000 }
      );
      const filesOnly = route.route.map((step) => step.sourcePath.replace(/:\d+(?:-\d+)?$/, ""));

      expect(filesOnly).toEqual(expect.arrayContaining([
        "src/createStore.ts",
        "test/createStore.spec.ts"
      ]));
      expect(filesOnly).not.toContain("test/combineReducers.spec.ts");
      expect(filesOnly).not.toContain("test/utils/formatProdErrorMessage.spec.ts");
    });
  });

  it("reserves a root-level module mirror when the implementation owns the task behavior", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        [
          "named.go",
          "package query\nvar valuesReg = regexp.MustCompile(`\\)\\s*(?i)VALUES\\s*\\(`)\nfunc fixBound(bound string, loop int) string { return valuesReg.ReplaceAllString(bound, `VALUES`) }\n"
        ],
        [
          "named_test.go",
          "package query\nfunc TestFixBounds(t *testing.T) { table := []string{`INSERT INTO foo VALUES (:a)`}; _ = fixBound(table[0], 1) }\n"
        ],
        [
          "reflectx/reflect.go",
          "package reflectx\ntype Mapper struct{}\nfunc (m *Mapper) FieldByIndexes(value any, indexes []int) any { return value }\n"
        ],
        [
          "reflectx/reflect_test.go",
          "package reflectx\nfunc TestMapperTableCases(t *testing.T) { table := []struct{ values []any }{}; _ = table }\n"
        ],
        [
          "sqlx.go",
          "package query\nfunc values(dest any) []any { return []any{dest} }\n"
        ],
        [
          "sqlx_test.go",
          "package query\nfunc TestNamedQuery(t *testing.T) { table := []struct{ values []any }{}; _ = table }\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const route = await routePalace(
        root,
        "Fix: Table contains VALUES",
        { routeLimit: 6, budget: 6000 }
      );
      const filesOnly = route.route.map((step) => step.sourcePath.replace(/:\d+(?:-\d+)?$/, ""));

      expect(filesOnly).toEqual(expect.arrayContaining(["named.go", "named_test.go"]));
      expect(filesOnly).not.toContain("reflectx/reflect_test.go");
      expect(filesOnly.length).toBeLessThanOrEqual(4);
    });
  });

  it("treats a trailing without-clause as a guardrail and keeps the behavioral owner pair", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        [
          "lib/redaction.js",
          "export function buildRedactionShape(paths) { const shape = {}; for (const path of paths) shape[path] = true; return shape; }\n"
        ],
        [
          "test/redact.test.js",
          "import { buildRedactionShape } from '../lib/redaction.js';\ndescribe('redact', () => it('builds a safe shape', () => buildRedactionShape(['secret'])));\n"
        ],
        [
          "pino.js",
          "import { buildRedactionShape } from './lib/redaction.js';\nexport function logger(options) { return Object.prototype.hasOwnProperty.call(options, 'redact') ? buildRedactionShape(options.redact) : {}; }\n"
        ],
        [
          "test/basic.test.js",
          "import { logger } from '../pino.js';\ndescribe('basic logger shape', () => it('uses Object.prototype for ordinary options', () => logger({})));\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const route = await routePalace(
        root,
        "fix: build the redaction shape without Object.prototype",
        { routeLimit: 4, budget: 6000 }
      );
      const filesOnly = route.route.map((step) => step.sourcePath.replace(/:\d+(?:-\d+)?$/, ""));

      expect(filesOnly).toEqual(expect.arrayContaining([
        "lib/redaction.js",
        "test/redact.test.js"
      ]));
      expect(filesOnly).not.toContain("test/basic.test.js");
      expect(route.confidence).toBeLessThanOrEqual(0.9);
    });
  });

  it("caps confidence when a subject implementation has no owner-local verification", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        [
          "lib/redaction.js",
          "export function buildRedactionShape(paths) { return paths.reduce((shape, key) => ({ ...shape, [key]: true }), {}); }\n"
        ],
        [
          "logger.js",
          "import { buildRedactionShape } from './lib/redaction.js';\nexport function logger(options) { return buildRedactionShape(options.redact || []); }\n"
        ],
        [
          "test/basic.test.js",
          "import { logger } from '../logger.js';\ndescribe('basic logger', () => it('accepts Object.prototype options', () => logger({})));\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const route = await routePalace(
        root,
        "fix: build the redaction shape without Object.prototype",
        { routeLimit: 4, budget: 6000 }
      );

      expect(route.confidence).toBeLessThanOrEqual(0.4);
    });
  });

  it("prefers an exact member verification over a generic task-phrase test", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        [
          "src/blinker/base.py",
          "class Signal:\n    def connected_to(self, receiver):\n        return receiver\n\n    def send(self):\n        return None\n"
        ],
        [
          "tests/test_signals.py",
          "from blinker.base import Signal\ndef test_signal_signals_any_sender():\n    signal = Signal()\n    assert signal.send() is None\n"
        ],
        [
          "tests/test_context.py",
          "def test_temporary_context_manager_switches_resource_off():\n    assert 'context manager temporary switching off'\n"
        ],
        [
          "docs/index.rst",
          "Blinker Documentation\n=====================\n\nSignal instances support connected context managers.\n"
        ],
        [
          "CHANGES.rst",
          "Context managers can temporarily switch resources off.\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const route = await routePalace(
        root,
        "Added `muted` context manager for temproary switching signal off (#84)",
        { routeLimit: 4, budget: 6000 }
      );
      const filesOnly = route.route.map((step) => step.sourcePath.replace(/:\d+(?:-\d+)?$/, ""));

      expect(filesOnly).toEqual(expect.arrayContaining([
        "src/blinker/base.py",
        "tests/test_signals.py",
        "docs/index.rst"
      ]));
      expect(filesOnly).not.toContain("tests/test_context.py");
      expect(filesOnly).not.toContain("CHANGES.rst");
    });
  });

  it("classifies inflected leading task actions before incidental intent words", () => {
    expect(classifyTask("Fixes argument parsing for escaped newlines (#1176)")).toBe("bugfix");
    expect(classifyTask("Avoid associating #[from] with lint allow")).toBe("bugfix");
    expect(classifyTask("Prevents stale connections from being reused")).toBe("bugfix");
    expect(classifyTask("Added structured route diagnostics")).toBe("feature");
    expect(classifyTask("Implements focused implementation and test pairing")).toBe("feature");
    expect(classifyTask("Enables deterministic context packing")).toBe("feature");
    expect(classifyTask("Updated dependency metadata")).toBe("unknown");
  });

  it("distinguishes release work from publish failures and application deployment", () => {
    const analysis = analyzeTask(RELEASE_TASK);

    expect(classifyTask(RELEASE_TASK)).toBe("release");
    expect(classifyTask("发布 Vertex Palace 新版本到 npm 并建立 Git tag")).toBe("release");
    expect(classifyTask("Fix npm publish authentication failure E401")).toBe("bugfix");
    expect(classifyTask("Fixes npm publish authentication failure E401")).toBe("bugfix");
    expect(classifyTask("修复 npm 发布失败 E401")).toBe("bugfix");
    expect(classifyTask("Deploy the application to production")).toBe("unknown");
    expect(classifyTask("Improve release verification script routing")).toBe("refactor");
    expect(classifyTask("优化发布验证脚本路由")).toBe("refactor");
    expect(analysis.keywords).toEqual(expect.arrayContaining([
      "release",
      "package",
      "manifest",
      "npm",
      "registry",
      "tag",
      "plugin",
      "mcp",
      "adaptive",
      "mode",
      "selector",
      "context",
      "packer",
      "test"
    ]));
  });

  it("treats public API preservation as a guardrail instead of an API route target", () => {
    const analysis = analyzeTask("Fix currency formatting so negative zero is rendered as $0.00. Keep the public API stable.");

    expect(analysis.keywords).toEqual(expect.arrayContaining(["currency", "formatting", "negative", "zero"]));
    expect(analysis.keywords).not.toEqual(expect.arrayContaining(["api", "controller", "0", "00"]));
    expect(analysis.wingHints).not.toContain("api");
  });

  it("normalizes bug-report morphology without inventing evaluation or product-variant intent", () => {
    const zodTask = "A codec-backed discriminated union fails when encoding because discriminator values differ.";
    const requestsTask = "Fix redirect authorization handling for HTTP-to-HTTPS upgrades and stripped credentials.";

    expect(classifyTask(zodTask)).toBe("bugfix");
    expect(analyzeTask(zodTask).keywords).toEqual(expect.arrayContaining(["codec", "discriminated", "union", "encode", "discriminator", "value"]));
    expect(analyzeTask(zodTask).wingHints).not.toContain("variant");
    expect(analyzeTask(requestsTask).keywords).toEqual(expect.arrayContaining(["redirect", "auth", "upgrade", "strip", "credential"]));
    expect(analyzeTask(requestsTask).keywords).not.toEqual(expect.arrayContaining(["evaluation", "evaluate", "confidence", "grade"]));
  });

  it("routes a Python redirect-auth bug from focused tests to the complete implementation method", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        [
          "src/requests/sessions.py",
          `class SessionRedirectMixin:
    def should_strip_auth(self, old_url: str, new_url: str) -> bool:
        if old_url == new_url:
            return False
        if old_url.startswith("https") and new_url.startswith("http:"):
            return True
        return old_url != new_url
`
        ],
        [
          "tests/test_requests.py",
          `def test_should_strip_auth_default_port():
    assert True

def test_should_strip_auth_http_downgrade():
    assert True
`
        ],
        ["tests/test_utils.py", "def test_default_credentials():\n    assert True\n"]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const route = await routePalace(
        root,
        "Fix redirect authorization handling so credentials are preserved for same-host default-port redirects and HTTP-to-HTTPS upgrades, but stripped on host, downgrade, or nonstandard port changes. Update the focused regression tests.",
        { routeLimit: 6 }
      );
      const joined = route.route.map((step) => step.sourcePath).join("\n");

      expect(route.taskType).toBe("bugfix");
      expect(joined).toContain("src/requests/sessions.py");
      expect(joined).toContain("tests/test_requests.py");
      expect(route.route.find((step) => step.sourcePath.startsWith("src/requests/sessions.py"))?.sourcePath).toMatch(/:2-7$/);
      expect(route.route.map((step) => step.sourcePath.replace(/:\d+(?:-\d+)?$/, ""))).toEqual([
        "src/requests/sessions.py",
        "tests/test_requests.py"
      ]);
      expect(route.excluded.map((item) => item.sourcePath)).not.toContain("src/requests");
    });
  });

  it("routes a codec-backed discriminated-union bug to v4 core implementation and tests", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        [
          "packages/zod/src/v4/core/schemas.ts",
          `export const $ZodCodec = core.$constructor("$ZodCodec", () => true);
export const $ZodDiscriminatedUnion = core.$constructor("$ZodDiscriminatedUnion", (inst, def) => {
  inst.parse = (payload, ctx) => ctx.direction === "backward" ? encode(payload) : decode(payload);
});
`
        ],
        [
          "packages/zod/src/v3/types.ts",
          `export class ZodDiscriminatedUnion {
  _parse(input: unknown) {
    const discriminator = "type";
    const value = input;
    const output = value;
    return { discriminator, output };
  }

  static create(discriminator: string, options: unknown[]) {
    return { discriminator, options };
  }
}
`
        ],
        ["packages/zod/src/v4/classic/schemas.ts", `export function discriminatedUnion() { return "v4 wrapper"; }\n`],
        ["packages/zod/src/v4/classic/tests/discriminated-unions.test.ts", `import { z } from "zod/v4";\ntest("encode with codec discriminator", () => z);\n`],
        ["packages/zod/src/v3/tests/discriminated-unions.test.ts", `import { z } from "zod/v3";\ntest("legacy discriminator", () => z);\n`],
        ["packages/bench/discriminated-union.ts", `export const discriminatedUnionBenchmark = () => "benchmark";\n`]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const route = await routePalace(
        root,
        "A codec-backed discriminated union decodes correctly but fails when encoding because input and output discriminator values differ. Preserve fast decoding while allowing backward encoding to select the right option, and update the focused regression tests.",
        { routeLimit: 6 }
      );
      const joined = route.route.map((step) => step.sourcePath).join("\n");

      expect(route.taskType).toBe("bugfix");
      expect(joined).toContain("packages/zod/src/v4/core/schemas.ts");
      expect(joined).toContain("packages/zod/src/v4/classic/tests/discriminated-unions.test.ts");
      expect(joined).not.toContain("packages/zod/src/v3/types.ts");
      expect(joined).not.toContain("packages/bench/discriminated-union.ts");
      expect(route.route.find((step) => step.sourcePath.startsWith("packages/zod/src/v4/core/schemas.ts"))?.tier).toBe("primary");
      expect(route.route.map((step) => step.sourcePath.replace(/:\d+(?:-\d+)?$/, ""))).toEqual([
        "packages/zod/src/v4/core/schemas.ts",
        "packages/zod/src/v4/classic/tests/discriminated-unions.test.ts"
      ]);
      expect(route.excluded.map((item) => item.sourcePath)).not.toContain("packages");
    });
  });

  it("keeps declaration-only type fixes inside declarations, type tests, and package metadata", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        ["index.js", "export const limitFunction = (function_, options) => (...arguments_) => function_(...arguments_);\n"],
        ["index.d.ts", "export function limitFunction<Arguments extends unknown[], ReturnType>(function_: (...arguments_: Arguments) => PromiseLike<ReturnType>, options: {concurrency: number}): (...arguments_: Arguments) => Promise<ReturnType>;\n"],
        ["index.test-d.ts", "import {expectType} from 'tsd';\nimport {limitFunction} from './index.js';\nexpectType<Promise<number>>(limitFunction(async (value: number) => value, {concurrency: 1})(1));\n"],
        ["test.js", "test('limitFunction runtime behavior', async t => t.is(await limitFunction(async () => 1)(), 1));\n"],
        ["benchmark.js", "export const benchmark = () => limitFunction(async () => 1, {concurrency: 1});\n"],
        ["scripts/benchmarker.js", "export const benchmarker = () => 'runtime benchmark';\n"],
        ["package.json", JSON.stringify({ name: "p-limit", type: "module", exports: { types: "./index.d.ts", default: "./index.js" }, scripts: { test: "xo && ava && tsd" } })]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const route = await routePalace(
        root,
        "Fix the overly permissive public limitFunction type. It currently accepts synchronous functions even though limiting synchronous execution has no effect. Restrict it to asynchronous functions, preserve inferred argument and return types, and add focused compile-time regression coverage using the repository's existing type-test setup.",
        { routeLimit: 6, budget: 6000 }
      );
      const filesOnly = route.route.map((step) => step.sourcePath.replace(/:\d+(?:-\d+)?$/, ""));

      expect(route.taskType).toBe("bugfix");
      expect(filesOnly).toEqual(["index.d.ts", "index.test-d.ts", "package.json"]);
      expect(route.route.find((step) => step.sourcePath.startsWith("index.d.ts"))?.tier).toBe("primary");
      expect(route.route.find((step) => step.sourcePath === "index.test-d.ts")?.tier).toBe("support");
      expect(filesOnly).not.toContain("index.js");
      expect(filesOnly).not.toContain("test.js");
      expect(filesOnly).not.toContain("benchmark.js");
      expect(filesOnly).not.toContain("scripts/benchmarker.js");
      expect(route.excluded.filter((item) => filesOnly.includes(item.sourcePath))).toEqual([]);
    });
  });

  it("closes a missing public static member across runtime, declarations, and both test surfaces", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        [
          "src/response.js",
          `export class Response {
  static error() { return new Response(); }
  static redirect(url) { return new Response(url); }
}
`
        ],
        [
          "src/index.js",
          "export {Response} from './response.js';\n"
        ],
        [
          "@types/index.d.ts",
          `export class Response {
  static error(): Response;
  static redirect(url: string): Response;
}
`
        ],
        [
          "@types/index.test-d.ts",
          "import {expectType} from 'tsd';\nimport {Response} from './index.js';\nexpectType<Response>(Response.redirect('https://example.test'));\n"
        ],
        [
          "test/main.js",
          "import {Response} from '../src/index.js';\ntest('Response public static constructors', () => Response.redirect('https://example.test'));\n"
        ],
        [
          "test/response.js",
          "import {Response} from '../src/response.js';\ntest('Response body behavior', () => new Response());\n"
        ],
        [
          "test/form-data.js",
          "import {Response} from '../src/index.js';\ntest('form data response bodies', () => [new Response('a'), new Response('b'), new Response('c')]);\n"
        ],
        [
          "test/request.js",
          "test('Request body behavior', () => true);\n"
        ],
        [
          "docs/v3-UPGRADE-GUIDE.md",
          "# Upgrading to v3\n\n## `Response.statusText` no longer sets a default message\n\nResponse status text now remains blank.\n\n## Creating Request/Response objects with relative URLs is no longer supported\n\nRequest and Response objects now require absolute URLs.\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const route = await routePalace(
        root,
        "feat: add static Response.json (#1670)",
        { routeLimit: 8, budget: 6000 }
      );
      const filesOnly = route.route.map((step) => step.sourcePath.replace(/:\d+(?:-\d+)?$/, ""));

      expect(filesOnly).toEqual(expect.arrayContaining([
        "src/response.js",
        "@types/index.d.ts",
        "@types/index.test-d.ts",
        "test/main.js"
      ]));
      expect(filesOnly).not.toContain("test/response.js");
      expect(filesOnly).not.toContain("test/request.js");
      expect(filesOnly).not.toContain("test/form-data.js");
      expect(filesOnly).not.toContain("docs/v3-UPGRADE-GUIDE.md");
      expect(filesOnly).toHaveLength(4);
      expect(route.confidence).toBeLessThanOrEqual(0.4);
      expect(route.evidenceClosure?.termCoverage.subjects.missing).toContain("Response.json");
    });
  });

  it("keeps one strongest runtime test when relation-adjacent tests add no independent evidence", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        [
          "src/deferred.ts",
          "export class DeferredBuilder { async resolve(build: () => unknown) { return build(); } }\n"
        ],
        [
          "src/index.ts",
          "export { DeferredBuilder } from './deferred';\n"
        ],
        [
          "src/schema.ts",
          "import { DeferredBuilder } from './deferred';\nexport const validateObject = async (build: () => unknown) => new DeferredBuilder().resolve(build);\n"
        ],
        [
          "test/deferred.test.ts",
          "import { DeferredBuilder } from '../src/deferred';\ntest('deferred builder errors resolve asynchronously', async () => new DeferredBuilder().resolve(() => { throw new Error('validation'); }));\n"
        ],
        [
          "test/object.test.ts",
          "import { validateObject } from '../src/schema';\ntest('object validation uses deferred builders', async () => validateObject(() => { throw new Error('validation'); }));\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const route = await routePalace(
        root,
        "fix: deferred validation errors thrown in builders should resolve async like other validations",
        { routeLimit: 8, budget: 6000 }
      );
      const filesOnly = route.route.map((step) => step.sourcePath.replace(/:\d+(?:-\d+)?$/, ""));

      expect(filesOnly).toContain("src/deferred.ts");
      expect(filesOnly).toContain("test/deferred.test.ts");
      expect(filesOnly).not.toContain("test/object.test.ts");
    });
  });

  it("routes missing trait members through the owner and a generic integration test without adapter fan-out", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        [
          "src/lib.rs",
          `pub trait Itertools: Iterator {
    fn intersperse(self) where Self: Sized {}
    fn peeking_take_while(self) where Self: Sized {}
}
`
        ],
        [
          "src/peeking_take_while.rs",
          "use crate::Itertools;\npub fn peeking_take_while_adapter<I: Itertools>(iter: I) { let _ = iter; }\n"
        ],
        [
          "src/adaptors/map.rs",
          "use crate::Itertools;\npub fn map_adapter<I: Itertools>(iter: I) { let _ = iter; }\n"
        ],
        [
          "tests/quick.rs",
          "use itertools::Itertools;\n#[test]\nfn iterator_trait_quick_properties() { let _ = (0..3).intersperse(1); }\n"
        ],
        [
          "tests/peeking_take_while.rs",
          "use itertools::Itertools;\n#[test]\nfn peeking_take_while_adapter() { let _ = (0..3).peeking_take_while(); }\n"
        ],
        [
          "tests/map.rs",
          "use itertools::Itertools;\n#[test]\nfn map_adapter() { let _ = (0..3).intersperse(1); }\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const route = await routePalace(
        root,
        "feat(Itertools): add strip_prefix and strip_prefix_by methods",
        { routeLimit: 8, budget: 6000 }
      );
      const filesOnly = route.route.map((step) => step.sourcePath.replace(/:\d+(?:-\d+)?$/, ""));

      expect(filesOnly).toEqual(expect.arrayContaining(["src/lib.rs", "tests/quick.rs"]));
      expect(filesOnly).not.toContain("src/peeking_take_while.rs");
      expect(filesOnly).not.toContain("tests/peeking_take_while.rs");
      expect(filesOnly).not.toContain("src/adaptors/map.rs");
      expect(filesOnly).not.toContain("tests/map.rs");
      expect(filesOnly.length).toBeLessThanOrEqual(3);
      expect(route.evidenceClosure?.requiredCausalSources).not.toContain("src/adaptors/map.rs");
    });
  });

  it("keeps a focused regression test when release verification scripts compete for a small bugfix route", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        ["packages/core/src/router/analyze-task.ts", "export function analyzeTask() { return ['evidence', 'route']; }\n"],
        ["packages/core/src/router/classify-task.ts", "export function classifyTask() { return 'bugfix'; }\n"],
        ["packages/core/src/router/route-planner.ts", "export function routePalace() { return ['implementation', 'verification']; }\n"],
        ["packages/core/test/router.test.ts", "describe('release-candidate evidence routing', () => it('keeps the regression companion', () => true));\n"],
        ["packages/core/test/unrelated.test.ts", "describe('payment checkout', () => it('stays unrelated', () => true));\n"],
        ["scripts/verify-release-candidate.cjs", "module.exports = () => 'clean tarball release candidate';\n"],
        ["scripts/verify-real-repositories.cjs", "module.exports = () => 'real repository evidence';\n"],
        ["scripts/verify-release-classification.cjs", "module.exports = () => 'verify release candidate evidence classification';\n"],
        ["scripts/verify-evidence-router.cjs", "module.exports = () => 'verify focused evidence router regression';\n"],
        ["scripts/smoke-npm-release.cjs", "module.exports = () => 'smoke actual npm release intent';\n"],
        ["scripts/benchmark-release-route.cjs", "module.exports = () => 'benchmark release candidate route evidence';\n"]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const route = await routePalace(
        root,
        "Fix release-candidate evidence classification and update the focused router regression tests while preserving actual npm release intent",
        { routeLimit: 4, budget: 6000 }
      );
      const filesOnly = route.route.map((step) => step.sourcePath.replace(/:\d+(?:-\d+)?$/, ""));

      expect(route.taskType).toBe("bugfix");
      expect(filesOnly).toContain("packages/core/src/router/analyze-task.ts");
      expect(filesOnly).toContain("packages/core/test/router.test.ts");
      expect(filesOnly).not.toContain("packages/core/test/unrelated.test.ts");
      expect(route.route.length).toBeGreaterThanOrEqual(2);
      expect(route.route.length).toBeLessThanOrEqual(4);
    });
  });

  it("routes a coordinated refactor through sibling modules, focused tests, and its generated MCP artifact", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        ["packages/core/package.json", JSON.stringify({ name: "@vertex-palace/core", main: "./dist/index.js" })],
        [
          "packages/core/src/index.ts",
          "export * from './router/analyze-task';\nexport * from './router/classify-task';\n"
        ],
        [
          "packages/core/src/router/publication-intent.ts",
          "export function publicationIntent() { return 'publish'; }\n"
        ],
        [
          "packages/core/src/router/analyze-task.ts",
          "import { publicationIntent } from './publication-intent';\nexport const analyzeTask = () => publicationIntent();\n"
        ],
        [
          "packages/core/src/router/classify-task.ts",
          "import { publicationIntent } from './publication-intent';\nexport const classifyTask = () => publicationIntent();\n"
        ],
        [
          "packages/core/test/router.test.ts",
          "import { analyzeTask } from '../src/router/analyze-task';\ntest('publication intent routing', () => analyzeTask());\n"
        ],
        [
          "packages/mcp/src/server.ts",
          "import { analyzeTask } from '@vertex-palace/core';\nexport const startServer = () => analyzeTask();\n"
        ],
        [
          "tsup.plugin-mcp.config.ts",
          "import { defineConfig } from 'tsup';\nexport default defineConfig({ entry: { server: 'packages/mcp/src/server.ts' }, outDir: 'plugins/vertex-palace/mcp', outExtension: () => ({ js: '.cjs' }) });\n"
        ],
        ["plugins/vertex-palace/mcp/server.cjs", "module.exports = { generated: true };\n"]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const route = await routePalace(
        root,
        "Refactor publication-intent routing across analyze-task and classify-task, update the focused router tests, and rebuild the generated MCP bundle",
        { routeLimit: 8, budget: 6000 }
      );
      const routed = route.route.map((step) => step.sourcePath.replace(/:\d+(?:-\d+)?$/, ""));

      expect(route.taskType).toBe("refactor");
      expect(routed).toEqual(expect.arrayContaining([
        "packages/core/src/router/analyze-task.ts",
        "packages/core/src/router/classify-task.ts",
        "packages/core/src/router/publication-intent.ts",
        "packages/core/test/router.test.ts",
        "plugins/vertex-palace/mcp/server.cjs"
      ]));
      expect(route.route.some((step) => step.reason.includes("changed_with"))).toBe(true);
      expect(route.route.find((step) => step.sourcePath === "plugins/vertex-palace/mcp/server.cjs")?.loadLevel).toBe("summary");
    });
  });

  it("allocates a bounded route across coordinated implementation, verification, docs, config, and generated artifacts", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "packages/core/src/router/mode-selector.ts",
        "packages/core/src/packer/context-packer.ts",
        "packages/shared/src/types.ts",
        "packages/core/test/mode-selector.test.ts",
        "packages/core/test/context.test.ts",
        "packages/core/vitest.config.ts",
        "scripts/verify-release-candidate.cjs",
        "scripts/smoke-mcp.cjs",
        "docs/research/ADVISORY_SAFETY_CONTRACT_0_4_ALPHA.md",
        "docs/zh-CN/ADVISORY_SAFETY_CONTRACT_0_4_ALPHA.md",
        "plugins/vertex-palace/mcp/server.cjs"
      ];
      const sources = new Map<string, string>([
        ["packages/core/src/router/mode-selector.ts", "export function selectAdvisoryMode() { return { evidenceStatus: 'insufficient', interventionPolicy: 'advisory' }; }\n"],
        ["packages/core/src/packer/context-packer.ts", "export function packAdvisoryBoundaries() { return { stopEnforced: false }; }\n"],
        ["packages/shared/src/types.ts", "export type AdvisorySafetyContract = { evidenceStatus: 'sufficient' | 'insufficient'; interventionPolicy: 'advisory' | 'bounded' };\n"],
        ["packages/core/test/mode-selector.test.ts", "describe('advisory mode selector', () => it('requires sufficient evidence for bounded intervention', () => true));\n"],
        ["packages/core/test/context.test.ts", "describe('advisory context packer', () => it('does not enforce an early stop', () => true));\n"],
        ["packages/core/vitest.config.ts", "export default { test: { pool: 'forks', fileParallelism: false } };\n"],
        ["scripts/verify-release-candidate.cjs", "module.exports = () => 'verify advisory safety contract in a clean tarball';\n"],
        ["scripts/smoke-mcp.cjs", "module.exports = () => 'smoke generated MCP advisory payload';\n"],
        ["docs/research/ADVISORY_SAFETY_CONTRACT_0_4_ALPHA.md", "# Advisory Safety Contract 0.4 Alpha\n\nEvidence status and intervention authority remain separate.\n"],
        ["docs/zh-CN/ADVISORY_SAFETY_CONTRACT_0_4_ALPHA.md", "# Advisory Safety Contract 0.4 Alpha - Simplified Chinese\n\nBilingual evidence status and intervention authority.\n"],
        ["packages/mcp/src/server.ts", "export const startMcpServer = () => 'advisory payload';\n"],
        ["tsup.plugin-mcp.config.ts", "import { defineConfig } from 'tsup';\nexport default defineConfig({ entry: { server: 'packages/mcp/src/server.ts' }, outDir: 'plugins/vertex-palace/mcp', outExtension: () => ({ js: '.cjs' }) });\n"],
        ["plugins/vertex-palace/mcp/server.cjs", "module.exports = { generated: true, interventionPolicy: 'advisory' };\n"],
        ["packages/core/test/router.test.ts", "describe('unrelated route scoring', () => it('keeps old behavior', () => true));\n"],
        ["packages/core/vitest.integration.config.ts", "export default { test: { include: ['integration/**'] } };\n"],
        ["scripts/verify-publish-registry.cjs", "module.exports = () => 'verify npm registry publication';\n"],
        ["scripts/smoke-cli.cjs", "module.exports = () => 'smoke unrelated CLI';\n"],
        ["docs/research/ADAPTIVE_MEMORY_FIX_0_3_0.md", "# Historic Adaptive Memory Fix\n\nOld release verification evidence.\n"],
        ["docs/zh-CN/ADAPTIVE_MEMORY_FIX_0_3_0.md", "# Historic Adaptive Memory Fix - Simplified Chinese\n\nOld bilingual release evidence.\n"]
      ]);
      for (const [relativePath, source] of sources) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const task = "Improve advisory-safety routing across mode selection and context packing; update the shared contract, focused tests, bilingual research docs, release verification scripts, test configuration, and generated MCP artifact.";
      const analysis = analyzeTask(task);
      const evaluation = await evaluateRoute(root, task, {
        changedFiles,
        routeLimit: 12,
        budget: 6000,
        maxDrawers: 4
      });

      if (process.env.MULTI_SURFACE_ROUTING_REPORT === "1") {
        process.stdout.write(`${JSON.stringify({
          name: "advisory-multi-surface-0.4-alpha",
          taskType: evaluation.taskType,
          routeFiles: evaluation.route.files,
          changedFiles,
          changedFileCoverage: evaluation.coverage.changedFileCoverage,
          routeFocus: evaluation.coverage.routeFocus,
          confidence: evaluation.route.confidence,
          calibration: evaluation.calibration
        })}\n`);
      }

      expect(classifyTask(task)).toBe("refactor");
      expect(requestedRouteSurfaces(analysis)).toEqual(expect.arrayContaining([
        "implementation",
        "shared",
        "test",
        "config",
        "docs",
        "mcp"
      ]));
      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.fileCount).toBeLessThanOrEqual(12);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.9);
    });
  });

  it("keeps complete real-shaped multi-surface recall without filling the route with generic siblings", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "packages/core/src/router/publication-intent.ts",
        "packages/core/src/router/route-planner.ts",
        "packages/core/test/router.test.ts",
        "plugins/vertex-palace/mcp/server.cjs",
        "docs/research/MULTI_SURFACE_ROUTING_0_4_ALPHA.md",
        "docs/zh-CN/MULTI_SURFACE_ROUTING_0_4_ALPHA.md",
        "docs/research/evidence/advisory-multi-surface-routing-0.4-alpha.json"
      ];
      const sources = new Map<string, string>([
        ["packages/core/src/router/publication-intent.ts", "export function analyzePublicationIntent() { return { releaseArtifactReference: true }; }\n"],
        ["packages/core/src/router/route-planner.ts", "export function planMultiSurfaceRoute() { return ['implementation', 'test', 'docs', 'evidence', 'mcp']; }\n"],
        ["packages/core/test/router.test.ts", "describe('multi-surface route precision', () => it('preserves complete recall with a focused route', () => true));\n"],
        ["packages/mcp/src/server.ts", "export const startMcpServer = () => 'multi-surface route precision';\n"],
        ["tsup.plugin-mcp.config.ts", "import { defineConfig } from 'tsup';\nexport default defineConfig({ entry: { server: 'packages/mcp/src/server.ts' }, outDir: 'plugins/vertex-palace/mcp', outExtension: () => ({ js: '.cjs' }) });\n"],
        ["plugins/vertex-palace/mcp/server.cjs", "module.exports = { generated: true, routePrecision: '0.4-alpha' };\n"],
        ["docs/research/MULTI_SURFACE_ROUTING_0_4_ALPHA.md", "# Multi-Surface Routing 0.4 Alpha\n\nCurrent role-aware routing research and release-verification artifact intent.\n"],
        ["docs/zh-CN/MULTI_SURFACE_ROUTING_0_4_ALPHA.md", "# Multi-Surface Routing 0.4 Alpha - Simplified Chinese\n\nCurrent bilingual role-aware routing research.\n"],
        ["docs/research/evidence/advisory-multi-surface-routing-0.4-alpha.json", JSON.stringify({ schemaVersion: 1, routeFocus: 0.75, changedFileCoverage: 1 })],
        ["docs/research/MULTI_SURFACE_EVIDENCE_ROUTING_0_3_0.md", "# Historic Multi-Surface Evidence Routing\n\nOlder dense report about implementation, tests, bilingual docs, machine-readable evidence, generated MCP bundles, precision, and recall.\n"],
        ["docs/research/evidence/multi-surface-evidence-routing-0.3.0.json", JSON.stringify({ schemaVersion: 1, status: "historic", routeFocus: 0.58 })],
        ["packages/core/src/router/route-scorer.ts", "export function scoreRouteConfidence() { return 0.35; }\n"],
        ["packages/core/src/router/analyze-task.ts", "export function analyzeRoutingTask() { return ['precision', 'recall', 'confidence']; }\n"],
        ["packages/core/src/packer/context-packer.ts", "export function packRoutingContext() { return { routeLimit: 12 }; }\n"]
      ]);
      for (const [relativePath, source] of sources) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const task = "Improve multi-surface routing and release-verification artifact intent; add role-aware implementation and focused regression tests, bilingual research records, record machine-readable evidence, and rebuild the generated MCP bundle.";
      const evaluation = await evaluateRoute(root, task, {
        changedFiles,
        routeLimit: 12,
        budget: 6000,
        maxDrawers: 4
      });

      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.fileCount).toBeLessThanOrEqual(9);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.75);
      expect(evaluation.route.confidence).toBeGreaterThan(0.35);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("composes distinct implementation concerns with their tests and current research artifacts", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "packages/core/src/utils/lexical-tokens.ts",
        "packages/core/src/indexer/build-edges.ts",
        "packages/core/src/parser/parse-fallback.ts",
        "packages/core/src/router/route-planner.ts",
        "packages/core/test/lexical-tokens.test.ts",
        "packages/core/test/indexer.test.ts",
        "packages/core/test/parser.test.ts",
        "packages/core/test/router.test.ts",
        "scripts/verify-disclosed-routing-round-19-after-generic-repair.cjs",
        "docs/research/evidence/disclosed-routing-round-19-after-generic-repair-attempt-3-0.4-alpha.json",
        "docs/research/DISCLOSED_ROUTING_ROUND_19_GENERIC_REPAIR_RESULT_0_4_ALPHA.md",
        "docs/zh-CN/DISCLOSED_ROUTING_ROUND_19_GENERIC_REPAIR_RESULT_0_4_ALPHA.md",
        "plugins/vertex-palace/mcp/server.cjs"
      ];
      const sources = new Map<string, string>([
        [changedFiles[0], "export function normalizeBoundedLexicalMorphology() { return ['cloning', 'clone']; }\n"],
        [changedFiles[1], "export function resolveCommonJsPackageRootIntegration() { return 'declared package entry'; }\n"],
        [changedFiles[2], "export function preserveLongFallbackSymbolCompounds() { return 'neon-vfpv4'; }\n"],
        [changedFiles[3], "export function stopParsingErrorCausalClosure() { return ['parse', 'error', 'exact test']; }\n"],
        [changedFiles[4], "describe('bounded lexical morphology', () => it('normalizes cloning to clone', () => true));\n"],
        [changedFiles[5], "describe('CommonJS package-root integration edges', () => it('resolves the declared package entry', () => true));\n"],
        [changedFiles[6], "describe('long fallback symbols', () => it('preserves compound literals', () => true));\n"],
        [changedFiles[7], "describe('parsing-error causal closure', () => it('stops at the exact regression', () => true));\n"],
        [changedFiles[8], "export function verifyRound19GenericRepairReplay() { return { attempts: 3, status: 'failed-gate' }; }\n"],
        [changedFiles[9], JSON.stringify({ schemaVersion: 1, round: 19, attempt: 3, routeFocus: 0.771 })],
        [changedFiles[10], "# Disclosed Routing Round 19 Generic Repair Result\n\nAttempt 3 preserves the full failed-gate research lineage.\n"],
        [changedFiles[11], "# Round 19 Simplified Chinese Generic Repair Result\n\nAttempt 3 bilingual failed-gate research record.\n"],
        ["packages/mcp/src/server.ts", "export const startMcpServer = () => 'generic routing repair';\n"],
        ["tsup.plugin-mcp.config.ts", "import { defineConfig } from 'tsup';\nexport default defineConfig({ entry: { server: 'packages/mcp/src/server.ts' }, outDir: 'plugins/vertex-palace/mcp', outExtension: () => ({ js: '.cjs' }) });\n"],
        [changedFiles[12], "module.exports = { generated: true, round19GenericRepair: true };\n"],
        ["packages/core/src/router/route-scorer.ts", "export function scoreGenericRoutingResearch() { return 'historic broad match'; }\n"],
        ["scripts/test/round19-disclosed-generic-repair.test.cjs", "test('locks an older Round 19 disclosed repair route', () => true);\n"],
        ["scripts/test/round8-routing-repair-preregistration.test.cjs", "test('locks a historic routing repair preregistration', () => true);\n"],
        ["scripts/verify-disclosed-routing-round-11-after-owner-closure-repair.cjs", "export function verifyHistoricRound11Repair() { return true; }\n"],
        ["docs/research/evidence/disclosed-routing-round-11-after-owner-closure-repair-attempt-7-0.4-alpha.json", JSON.stringify({ round: 11, attempt: 7 })],
        ["docs/research/DISCLOSED_ROUTING_ROUND_11_OWNER_CLOSURE_REPAIR_RESULT_0_4_ALPHA.md", "# Historic Round 11 generic routing repair\n"],
        ["docs/zh-CN/DISCLOSED_ROUTING_ROUND_11_OWNER_CLOSURE_REPAIR_RESULT_0_4_ALPHA.md", "# Historic Round 11 bilingual generic routing repair\n"]
      ]);
      for (const [relativePath, source] of sources) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const task = "Complete the Round 19 generic routing repair: improve bounded lexical morphology, CommonJS package-root integration closure, long fallback-symbol compounds, and parsing-error causal stopping; add focused lexical, indexer, parser, and router regressions, update and run the disclosed replay verifier, record machine-readable Attempt 3 evidence, update English and Simplified Chinese reports, and rebuild the generated MCP bundle without repository-specific rules.";
      const evaluation = await evaluateRoute(root, task, {
        changedFiles,
        routeLimit: 14,
        budget: 7000,
        maxDrawers: 6
      });

      expect(requestedRouteSurfaces(analyzeTask(task))).toEqual(expect.arrayContaining([
        "implementation",
        "test",
        "evidence",
        "docs",
        "mcp"
      ]));
      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.files).not.toEqual(expect.arrayContaining([
        "packages/core/src/router/route-scorer.ts",
        "scripts/test/round19-disclosed-generic-repair.test.cjs",
        "scripts/test/round8-routing-repair-preregistration.test.cjs",
        "scripts/verify-disclosed-routing-round-11-after-owner-closure-repair.cjs",
        "docs/research/evidence/disclosed-routing-round-11-after-owner-closure-repair-attempt-7-0.4-alpha.json"
      ]));
      expect(evaluation.route.fileCount).toBeLessThanOrEqual(14);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.9);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("routes a bugfix research lifecycle through its numbered artifact family without treating a competition freeze as config", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "packages/core/src/router/route-planner.ts",
        "packages/core/src/router/route-scorer.ts",
        "packages/core/test/router.test.ts",
        "scripts/verify-disclosed-routing-round-13-after-subject-owner-closure-repair.cjs",
        "docs/research/DISCLOSED_ROUTING_ROUND_13_SUBJECT_OWNER_CLOSURE_REPAIR_RESULT_0_4_ALPHA.md",
        "docs/zh-CN/DISCLOSED_ROUTING_ROUND_13_SUBJECT_OWNER_CLOSURE_REPAIR_RESULT_0_4_ALPHA.md",
        "docs/research/evidence/disclosed-routing-round-13-after-subject-owner-closure-repair-attempt-1-0.4-alpha.json"
      ];
      const oldFamily = [
        "scripts/verify-held-out-confidence-calibration-round-8.cjs",
        "docs/research/ROUTE_PRECISION_AFTER_SELF_AUDIT_PROTOCOL_0_4_ALPHA.md",
        "docs/research/evidence/held-out-confidence-calibration-round-8.json",
        "scripts/verify-local-blind-routing-round-13.cjs",
        "docs/research/LOCAL_BLIND_ROUTING_ROUND_13_RESULT_0_4_ALPHA.md",
        "docs/research/evidence/local-blind-routing-validation-0.4-alpha-round-13.json",
        "packages/core/src/evidence/evidence-closure.ts",
        "packages/core/test/route-expander.test.ts"
      ];
      const sources = new Map<string, string>([
        [changedFiles[0], "export function selectResearchLifecycleRoute() { return ['implementation', 'test', 'evidence', 'docs']; }\n"],
        [changedFiles[1], "export function recognizeResearchLifecycleSurfaces() { return ['round13', 'bilingual']; }\n"],
        [changedFiles[2], "describe('round 13 research lifecycle routing', () => it('keeps the final artifact family', () => true));\n"],
        [changedFiles[3], "export function verifyRound13SubjectOwnerClosureRepair() { return { status: 'passed' }; }\n"],
        [changedFiles[4], "# Disclosed Routing Round 13 Subject Owner Closure Repair Result\n\nFinal English result after the subject owner closure repair.\n"],
        [changedFiles[5], "# 公开路由第 13 轮主体归属闭环修复结果\n\n主体归属闭环修复后的简体中文最终结果。\n"],
        [changedFiles[6], JSON.stringify({ schemaVersion: 1, round: 13, attempt: 1, status: "passed" })],
        [oldFamily[0], "export function verifyRound8ConfidenceCalibration() { return { status: 'historic' }; }\n"],
        [oldFamily[1], "# Route Precision After Self Audit Protocol\n\nHistoric Round 8 protocol and confidence calibration.\n"],
        [oldFamily[2], JSON.stringify({ schemaVersion: 1, round: 8, status: "historic" })],
        [oldFamily[3], "export function verifyLocalBlindRound13() { return { status: 'historic' }; }\n"],
        [oldFamily[4], "# Local Blind Routing Round 13 Result\n\nA competing same-round artifact family.\n"],
        [oldFamily[5], JSON.stringify({ schemaVersion: 1, round: 13, family: "local-blind" })],
        [oldFamily[6], "export function evaluateEvidenceClosure() { return 'generic closure'; }\n"],
        [oldFamily[7], "describe('route expansion', () => it('expands generic closure edges', () => true));\n"],
        ["packages/core/src/config/palace-config.ts", "export const competitionFreeze = { commit: false, push: false, publish: false };\n"],
        ["scripts/analyze-round-8-confidence-calibration.cjs", "export function analyzeRound8() { return 'historic'; }\n"]
      ]);
      for (const [relativePath, source] of sources) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const tasks = [
        "Fix subject-owner closure research routing after Round 13: update the planner and scorer, add regression tests and a verification script, record machine-readable evidence and bilingual result reports; keep the competition freeze and do not commit, push, or publish.",
        "修复第 Round 13 轮主体归属闭环研究路由：更新 planner 与 scorer，增加回归测试和验证脚本，记录机器可读证据与英文、简体中文结果报告；保持比赛冻结，不提交、不推送、不发布。"
      ];
      for (const task of tasks) {
        const analysis = analyzeTask(task);
        const surfaces = requestedRouteSurfaces(analysis);
        const evaluation = await evaluateRoute(root, task, {
          changedFiles,
          routeLimit: 8,
          budget: 6000,
          maxDrawers: 4
        });

        expect(classifyTask(task)).toBe("bugfix");
        expect(analysis.entities).toEqual(expect.arrayContaining(["round-13", "round13"]));
        expect(surfaces).toEqual(expect.arrayContaining([
          "implementation",
          "test",
          "docs",
          "evidence"
        ]));
        expect(surfaces).not.toContain("config");
        expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
        expect(evaluation.route.files).not.toEqual(expect.arrayContaining(oldFamily));
        expect(evaluation.route.files).not.toContain("packages/core/src/config/palace-config.ts");
        expect(evaluation.route.fileCount).toBeLessThanOrEqual(8);
        expect(evaluation.coverage.changedFileCoverage).toBe(1);
        expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.875);
        expect(evaluation.calibration.status).not.toBe("overconfident");
      }

      const continuationTask = "继续优化 Vertex Palace：完成 Round 13 主体归属闭环修复后的回归审计、完整验证、研究证据与简体中文记录；保持比赛冻结，不提交、不推送、不发布。";
      const continuationFiles = [
        changedFiles[0],
        changedFiles[2],
        changedFiles[4],
        changedFiles[5],
        changedFiles[6]
      ];
      const continuationEvaluation = await evaluateRoute(root, continuationTask, {
        changedFiles: continuationFiles,
        routeLimit: 8,
        budget: 6000,
        maxDrawers: 4
      });
      expect(continuationEvaluation.route.files).toEqual(expect.arrayContaining(continuationFiles));
      expect(continuationEvaluation.route.files).not.toContain(oldFamily[6]);
      expect(continuationEvaluation.route.files).not.toContain(oldFamily[7]);
      expect(continuationEvaluation.coverage.changedFileCoverage).toBe(1);
      expect(continuationEvaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("composes meta-routing clauses and real Round 13 outputs without leaking contrast terms into surfaces", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "packages/core/src/router/analyze-task.ts",
        "packages/core/src/router/route-scorer.ts",
        "packages/core/src/router/route-planner.ts",
        "packages/core/test/router.test.ts",
        "scripts/test/round13-research-lifecycle-routing-repair.test.cjs",
        "docs/research/evidence/research-lifecycle-routing-repair-round-13-self-audit-0.4-alpha.json",
        "docs/research/RESEARCH_LIFECYCLE_ROUTING_REPAIR_ROUND_13_RESULT_0_4_ALPHA.md",
        "docs/zh-CN/RESEARCH_LIFECYCLE_ROUTING_REPAIR_ROUND_13_RESULT_0_4_ALPHA.md"
      ];
      const coreChangedFiles = changedFiles.filter(
        (sourcePath) => sourcePath !== "scripts/test/round13-research-lifecycle-routing-repair.test.cjs"
      );
      const sources = new Map<string, string>([
        [changedFiles[0], "export function analyzeNumberedResearchLifecycleTask() { return ['round13', 'constraint', 'output']; }\n"],
        [changedFiles[1], "export function scoreResearchLifecycleSurfaces() { return ['implementation', 'test', 'evidence', 'docs']; }\n"],
        [changedFiles[2], "export function planResearchLifecycleOwners() { return ['analysis', 'scoring', 'planning']; }\n"],
        [changedFiles[3], "describe('research lifecycle routing', () => it('composes clauses', () => true));\n"],
        [changedFiles[4], "test('locks the Round 13 research lifecycle self audit', () => true);\n"],
        [changedFiles[5], JSON.stringify({ schemaVersion: 1, round: 13, artifact: "research-lifecycle-routing-repair-self-audit" })],
        [changedFiles[6], "# Round 13 Research Lifecycle Routing Repair Result\n\nPost-observation self-audit result.\n"],
        [changedFiles[7], "# 第 13 轮研究生命周期路由修复结果\n\n事后观察的自审结果。\n"],
        ["packages/core/src/config/palace-config.ts", "export const routingContrastConfiguration = true;\n"],
        ["docs/research/HELD_OUT_CONFIDENCE_CALIBRATION_PROTOCOL_0_4_ALPHA_ROUND_8.md", "# Historic Round 8 Protocol\n"],
        ["docs/zh-CN/HELD_OUT_CONFIDENCE_CALIBRATION_PROTOCOL_0_4_ALPHA_ROUND_8.md", "# 旧第 8 轮协议\n"]
      ]);
      for (const [relativePath, source] of sources) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const task = "修复研究生命周期任务的路由：保留编号阶段身份，区分比赛冻结约束与配置请求，识别研究证据和中英文报告产出，并让任务分析、路由评分、路由规划与回归验证形成完整闭环；记录 Round 13 自审证据和双语结果，只做本地修改测试，不提交、不推送、不发布。";
      const evaluation = await evaluateRoute(root, task, {
        changedFiles,
        routeLimit: 10,
        budget: 6000,
        maxDrawers: 4
      });

      expect(requestedRouteSurfaces(analyzeTask(task))).toEqual(expect.arrayContaining([
        "implementation",
        "test",
        "docs",
        "evidence"
      ]));
      expect(requestedRouteSurfaces(analyzeTask(task))).not.toContain("config");
      expect(evaluation.route.files).toEqual(expect.arrayContaining(coreChangedFiles));
      expect(evaluation.route.files).not.toContain("packages/core/src/config/palace-config.ts");
      expect(evaluation.route.files).not.toEqual(expect.arrayContaining([
        "docs/research/HELD_OUT_CONFIDENCE_CALIBRATION_PROTOCOL_0_4_ALPHA_ROUND_8.md",
        "docs/zh-CN/HELD_OUT_CONFIDENCE_CALIBRATION_PROTOCOL_0_4_ALPHA_ROUND_8.md"
      ]));
      expect(evaluation.coverage.changedFileCoverage).toBe(0.875);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.8);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("pairs bilingual reports across numbered rounds when the localized heading carries the identity", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "packages/core/src/router/analyze-task.ts",
        "packages/core/src/router/route-scorer.ts",
        "packages/core/src/router/route-planner.ts",
        "packages/core/test/router.test.ts",
        "docs/research/evidence/research-lifecycle-routing-repair-self-audit-0.4-alpha.json",
        "docs/research/evidence/compositional-lifecycle-routing-repair-round-14-self-audit-0.4-alpha.json",
        "docs/research/RESEARCH_LIFECYCLE_ROUTING_REPAIR_RESULT_0_4_ALPHA.md",
        "docs/zh-CN/RESEARCH_LIFECYCLE_ROUTING_REPAIR_RESULT_0_4_ALPHA.md",
        "docs/research/COMPOSITIONAL_LIFECYCLE_ROUTING_REPAIR_ROUND_14_RESULT_0_4_ALPHA.md",
        "docs/zh-CN/COMPOSITIONAL_LIFECYCLE_ROUTING_REPAIR_ROUND_14_RESULT_0_4_ALPHA.md"
      ];
      const sources = new Map<string, string>([
        [changedFiles[0], "export function analyzeResearchLifecycleTask() { return ['round13', 'round14']; }\n"],
        [changedFiles[1], "export function scoreResearchLifecycleSurfaces() { return ['implementation', 'test', 'evidence', 'docs']; }\n"],
        [changedFiles[2], "export function planResearchLifecycleOwners() { return ['analysis', 'scoring', 'planning']; }\n"],
        [changedFiles[3], "describe('compositional research lifecycle routing', () => it('pairs bilingual rounds', () => true));\n"],
        [changedFiles[4], JSON.stringify({ schemaVersion: 1, round: 13, artifact: "research-lifecycle-routing-repair-self-audit" })],
        [changedFiles[5], JSON.stringify({ schemaVersion: 1, round: 14, artifact: "compositional-lifecycle-routing-repair-self-audit" })],
        [changedFiles[6], "# Round 13 Research Lifecycle Routing Repair Result\n\nPost-observation self-audit result.\n"],
        [changedFiles[7], "# 第 13 轮研究生命周期路由修复结果\n\n事后观察的自审结果。\n"],
        [changedFiles[8], "# Round 14 Compositional Lifecycle Routing Repair Result\n\nClause-level repair result.\n"],
        [changedFiles[9], "# 第 14 轮组合式研究生命周期路由修复结果\n\n子句级修复结果。\n"],
        ["docs/research/DISCLOSED_ROUND_8_ROUTING_REPAIR_PROTOCOL_0_4_ALPHA.md", "# Historic Round 8 Routing Repair Protocol\n\nOld research lifecycle routing evidence.\n"],
        ["docs/zh-CN/DISCLOSED_ROUND_8_ROUTING_REPAIR_PROTOCOL_0_4_ALPHA.md", "# 第 8 轮历史路由修复协议\n\n旧研究生命周期路由证据。\n"]
      ]);
      for (const [relativePath, source] of sources) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const task = "Complete the Round 14 compositional research-lifecycle routing repair: make task analysis, route scoring, and route planning share the implementation closure, add a focused regression test, and record Round 13 and Round 14 machine evidence and bilingual reports; do not commit, push, or publish.";
      const evaluation = await evaluateRoute(root, task, {
        changedFiles,
        routeLimit: 10,
        budget: 6000,
        maxDrawers: 4
      });

      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.files).not.toContain(
        "docs/research/DISCLOSED_ROUND_8_ROUTING_REPAIR_PROTOCOL_0_4_ALPHA.md"
      );
      expect(evaluation.route.files).not.toContain(
        "docs/zh-CN/DISCLOSED_ROUND_8_ROUTING_REPAIR_PROTOCOL_0_4_ALPHA.md"
      );
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBe(1);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("raises compound bugfix confidence only with complete verification closure and sufficient budget", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "packages/core/src/router/analyze-task.ts",
        "packages/core/src/router/route-scorer.ts",
        "packages/core/src/router/route-planner.ts",
        "packages/core/test/router.test.ts",
        "docs/research/evidence/keystone-lifecycle-routing-repair.json",
        "docs/research/KEYSTONE_LIFECYCLE_ROUTING_REPAIR_RESULT.md",
        "docs/zh-CN/KEYSTONE_LIFECYCLE_ROUTING_REPAIR_RESULT.md"
      ];
      const completeTestSource = [
        "import { analyzeKeystoneLifecycle } from '../src/router/analyze-task';",
        "import { scoreKeystoneLifecycle } from '../src/router/route-scorer';",
        "import { planKeystoneLifecycle } from '../src/router/route-planner';",
        "describe('Keystone lifecycle routing repair', () => it('verifies every implementation concern', () => {",
        "  expect([analyzeKeystoneLifecycle(), scoreKeystoneLifecycle(), planKeystoneLifecycle()]).toHaveLength(3);",
        "}));",
        ""
      ].join("\n");
      const sources = new Map<string, string>([
        [changedFiles[0], "export function analyzeKeystoneLifecycle() { return 'task-analysis'; }\n"],
        [changedFiles[1], "export function scoreKeystoneLifecycle() { return 'route-scoring'; }\n"],
        [changedFiles[2], "export function planKeystoneLifecycle() { return 'route-planning'; }\n"],
        [changedFiles[3], completeTestSource],
        [changedFiles[4], JSON.stringify({ schemaVersion: 1, artifact: "keystone-lifecycle-routing-repair", status: "passed" })],
        [changedFiles[5], "# Keystone Lifecycle Routing Repair Result\n\nTask analysis, route scoring, route planning, and product verification are complete.\n"],
        [changedFiles[6], "# Keystone Lifecycle Routing Repair Result - Simplified Chinese\n\n任务分析、路由评分、路由规划与产品验证已经完成。\n"],
        ["docs/research/ARCHIVE_KEYSTONE_ROUTING_NOTES.md", "# Archived Keystone Notes\n\nHistoric incomplete routing notes.\n"]
      ]);
      for (const [relativePath, source] of sources) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const task = "Fix the Keystone lifecycle router by updating task analysis, route scoring, and route planning; add a focused regression test, record machine-readable evidence, and write English and Simplified Chinese result reports.";
      const completeRoute = await routePalace(root, task, {
        routeLimit: 7,
        budget: 6000
      });
      const complete = await evaluateRoute(root, task, {
        routeId: completeRoute.id,
        changedFiles,
        routeLimit: 7,
        budget: 6000,
        maxDrawers: 4
      });

      expect(complete.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(complete.route.files).not.toContain("docs/research/ARCHIVE_KEYSTONE_ROUTING_NOTES.md");
      expect(complete.coverage.changedFileCoverage).toBe(1);
      expect(complete.coverage.routeFocus).toBe(1);
      expect(completeRoute.evidenceClosure?.status).toBe("sufficient");
      expect(completeRoute.narrowingEvidence?.independentImplementationAnchor).toBe("confirmed");
      expect(complete.route.confidence).toBeGreaterThanOrEqual(0.65);
      expect(complete.route.confidence).toBeLessThanOrEqual(0.7);
      expect(complete.calibration.status).not.toBe("overconfident");

      const tightBudgetRoute = await routePalace(root, task, {
        routeLimit: 7,
        budget: 100
      });
      expect(tightBudgetRoute.route.map((step) => step.sourcePath.replace(/:\d+(?:-\d+)?$/, "")))
        .toEqual(complete.route.files);
      expect(tightBudgetRoute.confidence).toBeLessThanOrEqual(0.4);

      await writeFile(
        path.join(root, changedFiles[3]),
        [
          "import { analyzeKeystoneLifecycle } from '../src/router/analyze-task';",
          "describe('Keystone lifecycle routing repair', () => it('checks only analysis', () => {",
          "  expect(analyzeKeystoneLifecycle()).toBe('task-analysis');",
          "}));",
          ""
        ].join("\n"),
        "utf8"
      );
      await indexPalace(root);
      const incompleteRoute = await routePalace(root, task, {
        routeLimit: 7,
        budget: 6000
      });
      const incomplete = await evaluateRoute(root, task, {
        routeId: incompleteRoute.id,
        changedFiles,
        routeLimit: 7,
        budget: 6000,
        maxDrawers: 4
      });
      expect(incomplete.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(incomplete.coverage.changedFileCoverage).toBe(1);
      expect(incompleteRoute.narrowingEvidence?.independentImplementationAnchor).toBe("missing");
      expect(incomplete.route.confidence).toBeLessThanOrEqual(0.4);
      expect(incomplete.calibration.status).not.toBe("overconfident");
    });
  });

  it("routes a calibration refactor through its current evidence family and causal product tests", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "packages/core/src/router/task-intent.ts",
        "packages/core/src/router/route-planner.ts",
        "packages/core/test/router.test.ts",
        "packages/core/test/evidence-model.test.ts",
        "docs/research/evidence/compass-confidence-evidence-gate-phase-27.json",
        "docs/research/COMPASS_CONFIDENCE_EVIDENCE_GATE_PHASE_27_RESULT.md",
        "docs/zh-CN/COMPASS_CONFIDENCE_EVIDENCE_GATE_PHASE_27_RESULT.md"
      ];
      const completeRouterTest = [
        "import { calibrateCompassConfidenceGate } from '../src/router/route-planner';",
        "describe('Compass confidence evidence gate', () => it('keeps the planner conservative', () => {",
        "  expect(calibrateCompassConfidenceGate()).toBe(0.68);",
        "}));",
        ""
      ].join("\n");
      const sources = new Map<string, string>([
        [
          changedFiles[0],
          "export function excludeCompassArtifactOutputQualifiers() { return ['english', 'json']; }\n"
        ],
        [
          changedFiles[1],
          "export function calibrateCompassConfidenceGate() { return 0.68; }\n"
        ],
        [changedFiles[2], completeRouterTest],
        [
          changedFiles[3],
          "import { excludeCompassArtifactOutputQualifiers } from '../src/router/task-intent';\ndescribe('Compass task intent', () => it('excludes output qualifiers', () => excludeCompassArtifactOutputQualifiers()));\n"
        ],
        [
          changedFiles[4],
          JSON.stringify({ schemaVersion: 1, phase: 27, artifact: "compass-confidence-evidence-gate", status: "passed" })
        ],
        [
          changedFiles[5],
          "# Compass Confidence Evidence Gate Phase 27 Result\n\nPlanner confidence and task-intent output qualifiers are verified.\n"
        ],
        [
          changedFiles[6],
          "# Compass Confidence Evidence Gate Phase 27 Result - Simplified Chinese\n\nPlanner confidence and task-intent output qualifiers are verified.\n"
        ],
        [
          "packages/core/src/router/route-scorer.ts",
          "export function scoreGenericArtifactOutputIntent() { return 0.99; }\n"
        ],
        [
          "packages/core/src/router/analyze-task.ts",
          "export function analyzeGenericConfidenceIntent() { return ['confidence', 'evidence']; }\n"
        ],
        [
          "docs/research/evidence/artifact-intent-bilingual-followup.json",
          JSON.stringify({ schemaVersion: 1, artifact: "artifact-intent-bilingual-followup", status: "historic" })
        ],
        [
          "docs/research/ARTIFACT_INTENT_BILINGUAL_FOLLOWUP_RESULT.md",
          "# Artifact Intent Bilingual Followup Result\n\nHistoric confidence evidence and output qualifier study.\n"
        ],
        [
          "docs/zh-CN/ARTIFACT_INTENT_BILINGUAL_FOLLOWUP_RESULT.md",
          "# Artifact Intent Bilingual Followup Result - Simplified Chinese\n\nHistoric result.\n"
        ],
        [
          "scripts/test/phase27-compass-report-lock.test.cjs",
          "test('locks the Phase 27 Compass report', () => true);\n"
        ]
      ]);
      for (const [relativePath, source] of sources) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const task = "Calibrate the Phase 27 Compass confidence evidence gate in task-intent and route-planner: exclude artifact output qualifiers from code subjects, keep confidence conservative when independent verification is missing or the route exceeds budget, add router and evidence-model regression tests, record Phase 27 machine evidence, and write English and Simplified Chinese result reports.";
      const completeRoute = await routePalace(root, task, {
        routeLimit: 7,
        budget: 6000
      });
      const complete = await evaluateRoute(root, task, {
        routeId: completeRoute.id,
        changedFiles,
        routeLimit: 7,
        budget: 6000,
        maxDrawers: 4
      });
      expect(complete.taskType).toBe("refactor");
      expect(requestedRouteSurfaces(analyzeTask(task))).not.toContain("shared");
      expect(complete.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(complete.route.fileCount).toBe(7);
      expect(complete.route.files).not.toEqual(expect.arrayContaining([
        "packages/core/src/router/route-scorer.ts",
        "packages/core/src/router/analyze-task.ts",
        "docs/research/evidence/artifact-intent-bilingual-followup.json",
        "docs/research/ARTIFACT_INTENT_BILINGUAL_FOLLOWUP_RESULT.md",
        "scripts/test/phase27-compass-report-lock.test.cjs"
      ]));
      expect(complete.coverage.changedFileCoverage).toBe(1);
      expect(complete.coverage.routeFocus).toBe(1);
      expect(completeRoute.narrowingEvidence?.independentImplementationAnchor).toBe("confirmed");
      expect(completeRoute.confidenceEvidence?.ambiguity).toBe(0);
      expect(complete.route.confidence).toBeGreaterThanOrEqual(0.65);
      expect(complete.route.confidence).toBeLessThanOrEqual(0.68);

      await writeFile(
        path.join(root, changedFiles[2]),
        "describe('Compass confidence evidence gate', () => it('has no planner import', () => true));\n",
        "utf8"
      );
      await indexPalace(root);
      const incompleteRoute = await routePalace(root, task, {
        routeLimit: 7,
        budget: 6000
      });

      expect(incompleteRoute.narrowingEvidence?.independentImplementationAnchor).toBe("missing");
      expect(incompleteRoute.confidence).toBeLessThanOrEqual(0.4);
    });
  });

  it("routes simultaneous planner and scorer work with its current bilingual precision evidence", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "packages/core/src/router/route-planner.ts",
        "packages/core/src/router/route-scorer.ts",
        "packages/core/test/router.test.ts",
        "plugins/vertex-palace/mcp/server.cjs",
        "docs/research/ROUTE_PRECISION_0_4_ALPHA.md",
        "docs/zh-CN/ROUTE_PRECISION_0_4_ALPHA.md",
        "docs/research/evidence/route-precision-0.4-alpha.json"
      ];
      const sources = new Map<string, string>([
        ["packages/core/src/router/route-planner.ts", "export function planRoleRepresentatives() { return { routeLimit: 'ceiling' }; }\n"],
        ["packages/core/src/router/route-scorer.ts", "export function scoreBroadTaskConfidence() { return 'dynamic'; }\n"],
        ["packages/core/test/router.test.ts", "describe('route precision', () => it('covers planner and scorer', () => true));\n"],
        ["packages/mcp/src/server.ts", "export const startMcpServer = () => 'route precision';\n"],
        ["tsup.plugin-mcp.config.ts", "import { defineConfig } from 'tsup';\nexport default defineConfig({ entry: { server: 'packages/mcp/src/server.ts' }, outDir: 'plugins/vertex-palace/mcp', outExtension: () => ({ js: '.cjs' }) });\n"],
        ["plugins/vertex-palace/mcp/server.cjs", "module.exports = { generated: true, routePrecision: '0.4-alpha' };\n"],
        ["docs/research/ROUTE_PRECISION_0_4_ALPHA.md", "# Route Precision 0.4 Alpha\n\nCurrent planner, scorer, confidence, and route-focus research.\n"],
        ["docs/zh-CN/ROUTE_PRECISION_0_4_ALPHA.md", "# Route Precision 0.4 Alpha - Simplified Chinese\n\nCurrent bilingual route-precision research.\n"],
        ["docs/research/evidence/route-precision-0.4-alpha.json", JSON.stringify({ schemaVersion: 1, routeFocus: 0.78, routeConfidence: 0.76 })],
        ["docs/research/MULTI_SURFACE_ROUTING_0_4_ALPHA.md", "# Multi-Surface Routing 0.4 Alpha\n\nEarlier multi-surface route planning report.\n"],
        ["docs/zh-CN/MULTI_SURFACE_ROUTING_0_4_ALPHA.md", "# Multi-Surface Routing 0.4 Alpha - Simplified Chinese\n\nEarlier bilingual report.\n"],
        ["docs/research/evidence/advisory-multi-surface-routing-0.4-alpha.json", JSON.stringify({ schemaVersion: 1, routeFocus: 0.58 })],
        ["packages/core/src/router/analyze-task.ts", "export function analyzeTaskWords() { return ['broad-task', 'json']; }\n"],
        ["packages/core/src/indexer/index-palace.ts", "export function indexEvidenceDirectoryJson() { return true; }\n"],
        ["packages/core/src/packer/context-packer.ts", "export function packRouteContext() { return true; }\n"],
        ["packages/core/src/utils/stable-json.ts", "export function stableJson() { return '{}'; }\n"]
      ]);
      for (const [relativePath, source] of sources) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const task = "Improve 0.4 Alpha route precision: make multi-surface routeLimit a ceiling, prioritize role representatives, recognize evidence-directory JSON, calibrate broad-task confidence dynamically, add regression tests and bilingual route-precision research evidence, and rebuild the generated MCP bundle.";
      const evaluation = await evaluateRoute(root, task, {
        changedFiles,
        routeLimit: 12,
        budget: 6000,
        maxDrawers: 4
      });

      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.fileCount).toBeLessThanOrEqual(9);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.75);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("routes evidence-sufficiency repair across planning, analysis, classification, scoring, and tests", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "packages/core/src/router/route-planner.ts",
        "packages/core/src/router/analyze-task.ts",
        "packages/core/src/router/classify-task.ts",
        "packages/core/src/router/route-scorer.ts",
        "packages/core/test/router.test.ts"
      ];
      const sources = new Map<string, string>([
        [changedFiles[0], "export function selectEvidenceSufficientRoute() { return 'focused anchor'; }\n"],
        [changedFiles[1], "export function preserveCompoundIntent() { return ['implementation', 'test']; }\n"],
        [changedFiles[2], "export function classifyScopedConventionalCommit() { return 'feature'; }\n"],
        [changedFiles[3], "export function capUnsupportedRouteConfidence() { return 0.4; }\n"],
        [changedFiles[4], "describe('evidence sufficiency', () => it('validates focused anchors', () => true));\n"],
        ["packages/core/src/router/publication-intent.ts", "export function analyzePublicationIntent() { return false; }\n"],
        ["packages/core/src/router/mode-selector.ts", "export function selectMode() { return 'advisory'; }\n"],
        ["packages/shared/src/types.ts", "export type RouteEvidence = { confidence: number };\n"]
      ]);
      for (const [relativePath, source] of sources) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const task = "Repair evidence-sufficiency stopping with focused-anchor validation, scoped Conventional Commit classification, compound-intent preservation, confidence caps, and regression tests.";
      const evaluation = await evaluateRoute(root, task, {
        changedFiles,
        routeLimit: 10,
        budget: 6000,
        maxDrawers: 4
      });

      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.fileCount).toBeLessThanOrEqual(8);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.625);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("routes a frozen cross-repository replication to its complete artifact family", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "scripts/verify-route-precision-cross-repositories.cjs",
        "docs/research/CROSS_REPOSITORY_ROUTE_PRECISION_PROTOCOL_0_4_ALPHA.md",
        "docs/zh-CN/CROSS_REPOSITORY_ROUTE_PRECISION_PROTOCOL_0_4_ALPHA.md",
        "docs/research/evidence/cross-repository-route-precision-0.4-alpha.json",
        "docs/research/CROSS_REPOSITORY_ROUTE_PRECISION_RESULT_0_4_ALPHA.md",
        "docs/zh-CN/CROSS_REPOSITORY_ROUTE_PRECISION_RESULT_0_4_ALPHA.md"
      ];
      const sources = new Map<string, string>([
        ["scripts/verify-route-precision-cross-repositories.cjs", "export function verifyCrossRepositoryRoutePrecision() { return ['zod', 'requests', 'p-limit']; }\n"],
        ["docs/research/CROSS_REPOSITORY_ROUTE_PRECISION_PROTOCOL_0_4_ALPHA.md", "# Cross-Repository Route Precision Protocol 0.4 Alpha\n\nFreeze the replication gates before the first observation.\n"],
        ["docs/zh-CN/CROSS_REPOSITORY_ROUTE_PRECISION_PROTOCOL_0_4_ALPHA.md", "# 0.4 Alpha 跨仓库路由精度协议\n\n首次观察前冻结复制门槛。\n"],
        ["docs/research/evidence/cross-repository-route-precision-0.4-alpha.json", JSON.stringify({ schemaVersion: 1, status: "passed", repositories: 3 })],
        ["docs/research/CROSS_REPOSITORY_ROUTE_PRECISION_RESULT_0_4_ALPHA.md", "# Cross-Repository Route Precision Result 0.4 Alpha\n\nReport the first replication observation.\n"],
        ["docs/zh-CN/CROSS_REPOSITORY_ROUTE_PRECISION_RESULT_0_4_ALPHA.md", "# 0.4 Alpha 跨仓库路由精度结果\n\n记录首次复制结果。\n"],
        ["packages/core/src/router/route-scorer.ts", "export function scoreGenericRoute() { return 0.72; }\n"],
        ["tsconfig.base.json", JSON.stringify({ compilerOptions: { strict: true } })],
        ["docs/research/MEMORY_PREFLIGHT_0_4_ALPHA_RESULT.md", "# Memory Preflight Result\n\nAn older first evidence report.\n"],
        ["docs/zh-CN/MEMORY_PREFLIGHT_0_4_ALPHA_RESULT.md", "# 记忆预检旧结果\n\n旧的首次证据报告。\n"],
        ["docs/research/MULTI_SURFACE_EVIDENCE_ROUTING_0_3_0.md", "# Historic Multi-Surface Evidence Routing\n\nOld route evidence research.\n"]
      ]);
      for (const [relativePath, source] of sources) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const tasks = [
        "Freeze and execute a cross-repository route precision replication across Zod, Requests, and p-limit; preserve the first JSON evidence and write English and Simplified Chinese result reports",
        "冻结并执行 Zod、Requests、p-limit 跨仓库路由精度复现实验，保留首次 JSON 证据并编写英文与简体中文结果报告"
      ];
      for (const task of tasks) {
        const analysis = analyzeTask(task);
        const evaluation = await evaluateRoute(root, task, {
          changedFiles,
          routeLimit: 9,
          budget: 6000,
          maxDrawers: 4
        });

        expect(classifyTask(task)).toBe("evaluation");
        expect(requestedRouteSurfaces(analysis)).toEqual(expect.arrayContaining(["test", "docs", "evidence"]));
        expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
        expect(evaluation.route.files).not.toEqual(expect.arrayContaining([
          "docs/research/MEMORY_PREFLIGHT_0_4_ALPHA_RESULT.md",
          "docs/zh-CN/MEMORY_PREFLIGHT_0_4_ALPHA_RESULT.md",
          "docs/research/MULTI_SURFACE_EVIDENCE_ROUTING_0_3_0.md"
        ]));
        expect(evaluation.route.fileCount).toBeLessThanOrEqual(8);
        expect(evaluation.coverage.changedFileCoverage).toBe(1);
        expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.75);
        expect(evaluation.calibration.status).not.toBe("overconfident");
      }
    });
  });

  it("keeps a newly named recursive artifact family ahead of an older scope-matching family", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "scripts/verify-route-precision-after-ember-ledger.cjs",
        "docs/research/ROUTE_PRECISION_AFTER_EMBER_LEDGER_PROTOCOL_0_4_ALPHA.md",
        "docs/zh-CN/ROUTE_PRECISION_AFTER_EMBER_LEDGER_PROTOCOL_0_4_ALPHA.md",
        "docs/research/evidence/route-precision-after-ember-ledger-0.4-alpha.json",
        "docs/research/ROUTE_PRECISION_AFTER_EMBER_LEDGER_RESULT_0_4_ALPHA.md",
        "docs/zh-CN/ROUTE_PRECISION_AFTER_EMBER_LEDGER_RESULT_0_4_ALPHA.md"
      ];
      const oldFamily = [
        "scripts/verify-cross-platform-route-precision.cjs",
        "docs/research/CROSS_PLATFORM_ROUTE_PRECISION_PROTOCOL_0_4_ALPHA.md",
        "docs/zh-CN/CROSS_PLATFORM_ROUTE_PRECISION_PROTOCOL_0_4_ALPHA.md",
        "docs/research/evidence/cross-platform-route-precision-0.4-alpha.json",
        "docs/research/CROSS_PLATFORM_ROUTE_PRECISION_RESULT_0_4_ALPHA.md",
        "docs/zh-CN/CROSS_PLATFORM_ROUTE_PRECISION_RESULT_0_4_ALPHA.md"
      ];
      const sources = new Map<string, string>([
        [changedFiles[0], "export function verifyEmberLedgerRoutePrecision() { return 'recursive family'; }\n"],
        [changedFiles[1], "# Route Precision After Ember Ledger Protocol\n\nFreeze the recursive family before observation.\n"],
        [changedFiles[2], "# Route Precision After Ember Ledger Protocol - Simplified Chinese\n\nFrozen translation.\n"],
        [changedFiles[3], JSON.stringify({ schemaVersion: 1, family: "ember-ledger", status: "pending" })],
        [changedFiles[4], "# Route Precision After Ember Ledger Result\n\nReport the recursive observation.\n"],
        [changedFiles[5], "# Route Precision After Ember Ledger Result - Simplified Chinese\n\nTranslated result.\n"],
        [oldFamily[0], "export function verifyCrossPlatformRoutePrecision() { return 'older family'; }\n"],
        [oldFamily[1], "# Cross Platform Route Precision Protocol\n\nFreeze cross-platform routing replication evidence.\n"],
        [oldFamily[2], "# Cross Platform Route Precision Protocol - Simplified Chinese\n\nOlder translated protocol.\n"],
        [oldFamily[3], JSON.stringify({ schemaVersion: 1, family: "cross-platform", status: "passed" })],
        [oldFamily[4], "# Cross Platform Route Precision Result\n\nDense cross-platform replication result and evidence report.\n"],
        [oldFamily[5], "# Cross Platform Route Precision Result - Simplified Chinese\n\nOlder translated result.\n"],
        ["packages/core/src/router/route-scorer.ts", "export function scorePostEmberLedgerCrossPlatformConfidence() { return 0.91; }\n"],
        ["tsconfig.base.json", JSON.stringify({ compilerOptions: { strict: true } })]
      ]);
      for (const [relativePath, source] of sources) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const task = "Freeze and execute the post-ember-ledger cross-platform routing regression; preserve the first JSON evidence and write English and Simplified Chinese protocol and result reports.";
      const evaluation = await evaluateRoute(root, task, {
        changedFiles,
        routeLimit: 9,
        budget: 6000,
        maxDrawers: 4
      });

      expect(classifyTask(task)).toBe("evaluation");
      expect(requestedRouteSurfaces(analyzeTask(task))).not.toContain("implementation");
      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.files).not.toEqual(expect.arrayContaining(oldFamily));
      expect(evaluation.route.files).not.toContain("packages/core/src/router/route-scorer.ts");
      expect(evaluation.route.fileCount).toBeLessThanOrEqual(7);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.75);
      expect(evaluation.calibration.status).not.toBe("overconfident");

      const chineseTask = "冻结并执行 post-ember-ledger 跨平台路由回归，保留首份 JSON 证据，并编写英文和简体中文协议与结果报告。";
      const chineseEvaluation = await evaluateRoute(root, chineseTask, {
        changedFiles,
        routeLimit: 9,
        budget: 6000,
        maxDrawers: 4
      });
      expect(classifyTask(chineseTask)).toBe("evaluation");
      expect(chineseEvaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(chineseEvaluation.route.files).not.toEqual(expect.arrayContaining(oldFamily));
      expect(chineseEvaluation.route.fileCount).toBeLessThanOrEqual(7);
      expect(chineseEvaluation.coverage.changedFileCoverage).toBe(1);
      expect(chineseEvaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.75);
      expect(chineseEvaluation.calibration.status).not.toBe("overconfident");

      const unresolvedTask = "Freeze and execute the post-cobalt-harbor cross-platform routing regression; preserve the first JSON evidence and write English and Simplified Chinese protocol and result reports.";
      const unresolved = await evaluateRoute(root, unresolvedTask, {
        changedFiles: [
          "scripts/verify-route-precision-after-cobalt-harbor.cjs",
          "docs/research/ROUTE_PRECISION_AFTER_COBALT_HARBOR_PROTOCOL_0_4_ALPHA.md",
          "docs/zh-CN/ROUTE_PRECISION_AFTER_COBALT_HARBOR_PROTOCOL_0_4_ALPHA.md",
          "docs/research/evidence/route-precision-after-cobalt-harbor-0.4-alpha.json",
          "docs/research/ROUTE_PRECISION_AFTER_COBALT_HARBOR_RESULT_0_4_ALPHA.md",
          "docs/zh-CN/ROUTE_PRECISION_AFTER_COBALT_HARBOR_RESULT_0_4_ALPHA.md"
        ],
        routeLimit: 9,
        budget: 6000,
        maxDrawers: 4
      });
      expect(unresolved.coverage.changedFileCoverage).toBe(0);
      expect(unresolved.route.confidence).toBeLessThanOrEqual(0.15);
      expect(unresolved.calibration.status).not.toBe("overconfident");

      const unresolvedChineseTask = "冻结并执行 post-cobalt-harbor 跨平台路由回归，保留首份 JSON 证据，并编写英文和简体中文协议与结果报告。";
      const unresolvedChinese = await evaluateRoute(root, unresolvedChineseTask, {
        changedFiles: unresolved.coverage.changedFiles,
        routeLimit: 9,
        budget: 6000,
        maxDrawers: 4
      });
      expect(unresolvedChinese.coverage.changedFileCoverage).toBe(0);
      expect(unresolvedChinese.route.confidence).toBeLessThanOrEqual(0.15);
      expect(unresolvedChinese.calibration.status).not.toBe("overconfident");
    });
  });

  it("keeps an explicit Latin artifact identity ahead of a Chinese-derived scope entity", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "scripts/verify-route-precision-after-self-audit.cjs",
        "docs/research/ROUTE_PRECISION_AFTER_SELF_AUDIT_PROTOCOL_0_4_ALPHA.md",
        "docs/zh-CN/ROUTE_PRECISION_AFTER_SELF_AUDIT_PROTOCOL_0_4_ALPHA.md",
        "docs/research/evidence/route-precision-after-self-audit-0.4-alpha.json",
        "docs/research/ROUTE_PRECISION_AFTER_SELF_AUDIT_RESULT_0_4_ALPHA.md",
        "docs/zh-CN/ROUTE_PRECISION_AFTER_SELF_AUDIT_RESULT_0_4_ALPHA.md"
      ];
      const oldFamily = [
        "scripts/verify-route-precision-cross-repositories.cjs",
        "docs/research/CROSS_REPOSITORY_ROUTE_PRECISION_PROTOCOL_0_4_ALPHA.md",
        "docs/zh-CN/CROSS_REPOSITORY_ROUTE_PRECISION_PROTOCOL_0_4_ALPHA.md",
        "docs/research/evidence/cross-repository-route-precision-0.4-alpha.json",
        "docs/research/CROSS_REPOSITORY_ROUTE_PRECISION_RESULT_0_4_ALPHA.md",
        "docs/zh-CN/CROSS_REPOSITORY_ROUTE_PRECISION_RESULT_0_4_ALPHA.md"
      ];
      const sources = new Map<string, string>();
      for (const relativePath of changedFiles) {
        sources.set(relativePath, `post-self-audit recursive artifact family: ${relativePath}\n`);
      }
      for (const relativePath of oldFamily) {
        sources.set(relativePath, `cross-repository route precision artifact family: ${relativePath}\n`);
      }
      sources.set("tsconfig.base.json", JSON.stringify({ compilerOptions: { strict: true } }));
      for (const [relativePath, source] of sources) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const task = "冻结并执行 post-self-audit 跨仓库路由回归，保留首份 JSON 证据，并编写英文和简体中文协议与结果报告。";
      const evaluation = await evaluateRoute(root, task, {
        changedFiles,
        routeLimit: 9,
        budget: 6000,
        maxDrawers: 4
      });

      expect(classifyTask(task)).toBe("evaluation");
      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.files).not.toEqual(expect.arrayContaining(oldFamily));
      expect(evaluation.route.fileCount).toBeLessThanOrEqual(7);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.75);
      expect(evaluation.calibration.status).not.toBe("overconfident");

      const unresolvedTask = "冻结并执行 post-cobalt-harbor 跨仓库路由回归，保留首份 JSON 证据，并编写英文和简体中文协议与结果报告。";
      const unresolved = await evaluateRoute(root, unresolvedTask, {
        changedFiles: changedFiles.map((relativePath) => relativePath.replaceAll("SELF_AUDIT", "COBALT_HARBOR").replaceAll("self-audit", "cobalt-harbor")),
        routeLimit: 9,
        budget: 6000,
        maxDrawers: 4
      });
      expect(unresolved.coverage.changedFileCoverage).toBe(0);
      expect(unresolved.route.confidence).toBeLessThanOrEqual(0.15);
      expect(unresolved.calibration.status).not.toBe("overconfident");
    });
  });

  it("keeps a product repair about a named artifact family on implementation, focused test, and generated bundle", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "packages/core/src/router/route-planner.ts",
        "packages/core/test/router.test.ts",
        "plugins/vertex-palace/mcp/server.cjs"
      ];
      const sources = new Map<string, string>([
        [changedFiles[0], "export function prioritizeExplicitArtifactIdentity() { return 'post-self-audit'; }\n"],
        [changedFiles[1], "describe('Chinese recursive artifact-family router', () => it('keeps explicit identity priority and confidence caps', () => true));\n"],
        [changedFiles[2], "module.exports = { generated: true, artifactIdentityPriority: true };\n"],
        ["packages/mcp/src/server.ts", "export const startMcpServer = () => 'artifact identity routing';\n"],
        ["tsup.plugin-mcp.config.ts", "import { defineConfig } from 'tsup';\nexport default defineConfig({ entry: { server: 'packages/mcp/src/server.ts' }, outDir: 'plugins/vertex-palace/mcp', outExtension: () => ({ js: '.cjs' }) });\n"],
        ["packages/core/src/router/route-scorer.ts", "export function scoreGenericRouteConfidence() { return 0.8; }\n"],
        ["packages/core/src/router/route-expander.ts", "export function expandGenericRoute() { return []; }\n"],
        ["packages/core/src/packer/context-packer.ts", "export function packGenericContext() { return {}; }\n"],
        ["packages/core/test/route-expander.test.ts", "describe('route expansion', () => it('expands graph neighbors', () => true));\n"],
        ["docs/research/ROUTE_PRECISION_AFTER_SELF_AUDIT_RESULT_0_4_ALPHA.md", "# Historical post-self-audit result\n"],
        ["docs/zh-CN/ROUTE_PRECISION_AFTER_SELF_AUDIT_RESULT_0_4_ALPHA.md", "# Historical post-self-audit result in Simplified Chinese\n"]
      ]);
      for (const [relativePath, source] of sources) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const task = "Fix the Simplified Chinese recursive artifact-family route so the explicit post-self-audit identity outranks a derived cross-repository scope entity, cap confidence for a missing Chinese family, preserve English and product regressions, and rebuild the generated MCP bundle.";
      const analysis = analyzeTask(task);
      const evaluation = await evaluateRoute(root, task, {
        changedFiles,
        routeLimit: 9,
        budget: 6000,
        maxDrawers: 4
      });

      expect(classifyTask(task)).toBe("bugfix");
      expect(requestedRouteSurfaces(analysis)).toEqual(expect.arrayContaining(["implementation", "test", "mcp"]));
      expect(requestedRouteSurfaces(analysis)).not.toContain("docs");
      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.files).not.toEqual(expect.arrayContaining([
        "packages/core/src/router/route-expander.ts",
        "packages/core/src/packer/context-packer.ts",
        "packages/core/test/route-expander.test.ts",
        "docs/research/ROUTE_PRECISION_AFTER_SELF_AUDIT_RESULT_0_4_ALPHA.md",
        "docs/zh-CN/ROUTE_PRECISION_AFTER_SELF_AUDIT_RESULT_0_4_ALPHA.md"
      ]));
      expect(evaluation.route.fileCount).toBeLessThanOrEqual(4);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.75);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("keeps both implementation concerns, focused tests, and generated MCP bundle in a compound bugfix", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "packages/core/src/router/analyze-task.ts",
        "packages/core/src/router/route-planner.ts",
        "packages/core/src/router/route-scorer.ts",
        "packages/core/src/storage/status.ts",
        "packages/core/test/router.test.ts",
        "packages/core/test/context.test.ts",
        "plugins/vertex-palace/mcp/server.cjs"
      ];
      const sources = new Map<string, string>([
        [changedFiles[0], "export function analyzeArtifactFamilyTask() { return ['family', 'freshness']; }\n"],
        [changedFiles[1], "export function planArtifactFamilyRoles() { return ['protocol', 'result', 'evidence']; }\n"],
        [changedFiles[2], "export function scoreArtifactFamilyConfidence() { return 'calibrated'; }\n"],
        [changedFiles[3], "export function appendGeneratedArtifactHashes() { return { stale: false }; }\n"],
        [changedFiles[4], "describe('artifact family route planning and confidence', () => it('keeps roles', () => true));\n"],
        [changedFiles[5], "describe('generated artifact index freshness', () => it('stays fresh', () => true));\n"],
        ["packages/mcp/src/server.ts", "export const startMcpServer = () => 'artifact family freshness';\n"],
        ["tsup.plugin-mcp.config.ts", "import { defineConfig } from 'tsup';\nexport default defineConfig({ entry: { server: 'packages/mcp/src/server.ts' }, outDir: 'plugins/vertex-palace/mcp', outExtension: () => ({ js: '.cjs' }) });\n"],
        [changedFiles[6], "module.exports = { generated: true, family: 'artifact-routing' };\n"],
        ["packages/core/src/indexer/index-palace.ts", "export function indexGenericRepository() { return true; }\n"],
        ["packages/core/src/packer/context-packer.ts", "export function packGenericContext() { return true; }\n"],
        ["packages/core/test/release-routing.test.ts", "describe('release routing', () => it('publishes packages', () => true));\n"],
        ["packages/core/test/route-expander.test.ts", "describe('route expansion', () => it('expands graph neighbors', () => true));\n"]
      ]);
      for (const [relativePath, source] of sources) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const task = "Fix generated-artifact index freshness in storage status and generalize artifact-family task analysis, route planning, and confidence scoring while preserving mixed feature release coverage; add focused router and context regression tests and rebuild the generated MCP bundle.";
      const evaluation = await evaluateRoute(root, task, {
        changedFiles,
        routeLimit: 9,
        budget: 6000,
        maxDrawers: 4
      });
      expect(classifyTask(task)).toBe("bugfix");
      expect(requestedRouteSurfaces(analyzeTask(task))).not.toEqual(expect.arrayContaining(["package", "docs"]));
      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.files).not.toEqual(expect.arrayContaining([
        "packages/mcp/src/server.ts",
        "packages/core/src/indexer/index-palace.ts",
        "packages/core/src/packer/context-packer.ts",
        "packages/core/test/release-routing.test.ts",
        "packages/core/test/route-expander.test.ts"
      ]));
      expect(evaluation.route.fileCount).toBeLessThanOrEqual(7);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.75);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("keeps release-vocabulary classification work ahead of adjacent analysis and evaluation modules", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "packages/core/src/router/classify-task.ts",
        "packages/core/src/router/publication-intent.ts",
        "packages/core/src/router/route-planner.ts",
        "packages/core/src/router/route-scorer.ts",
        "packages/core/test/router.test.ts",
        "packages/core/test/release-routing.test.ts",
        "plugins/vertex-palace/mcp/server.cjs"
      ];
      const sources = new Map<string, string>([
        [changedFiles[0], "export function classifyReleaseVocabularyAction() { return 'bugfix'; }\n"],
        [changedFiles[1], "export function analyzePublicationIntent() { return { releaseIntent: false }; }\n"],
        [changedFiles[2], "export function planRecursiveArtifactFamilyRoute() { return ['implementation', 'test', 'mcp']; }\n"],
        [changedFiles[3], "export function scoreRecursiveArtifactFamilyConfidence() { return 0.8; }\n"],
        [changedFiles[4], "describe('recursive artifact-family router', () => it('keeps classification concerns', () => true));\n"],
        [changedFiles[5], "describe('release vocabulary routing', () => it('preserves action intent', () => true));\n"],
        [changedFiles[6], "module.exports = { generated: true, releaseVocabulary: true };\n"],
        ["packages/mcp/src/server.ts", "export const startMcpServer = () => 'release vocabulary routing';\n"],
        ["tsup.plugin-mcp.config.ts", "import { defineConfig } from 'tsup';\nexport default defineConfig({ entry: { server: 'packages/mcp/src/server.ts' }, outDir: 'plugins/vertex-palace/mcp', outExtension: () => ({ js: '.cjs' }) });\n"],
        ["packages/core/src/router/analyze-task.ts", "export function analyzeArtifactFamilyTask() { return ['route', 'evidence']; }\n"],
        ["packages/core/src/evaluation/evaluate-route.ts", "export function evaluateArtifactFamilyRoute() { return { coverage: 1 }; }\n"],
        ["packages/core/test/context.test.ts", "describe('context evaluation', () => it('packs a route', () => true));\n"]
      ]);
      for (const [relativePath, source] of sources) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const task = "Fix release-vocabulary action classification and publication intent so a mixed feature release mention does not override recursive artifact-family route planning and confidence scoring; add focused router and release-routing regressions and rebuild the generated MCP bundle.";
      const evaluation = await evaluateRoute(root, task, {
        changedFiles,
        routeLimit: 9,
        budget: 6000,
        maxDrawers: 4
      });

      expect(classifyTask(task)).toBe("bugfix");
      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.files).not.toEqual(expect.arrayContaining([
        "packages/core/src/router/analyze-task.ts",
        "packages/core/src/evaluation/evaluate-route.ts",
        "packages/core/test/context.test.ts"
      ]));
      expect(evaluation.route.fileCount).toBeLessThanOrEqual(7);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBe(1);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("keeps the current bilingual document pair when an older report has denser matching prose", async () => {
    await withFixture("ts-api", async (root) => {
      const sources = new Map<string, string>([
        ["docs/research/MULTI_SURFACE_ROUTING_0_4_ALPHA.md", "# Multi-Surface Routing 0.4 Alpha\n\nCurrent advisory-safety routing research.\n"],
        ["docs/zh-CN/MULTI_SURFACE_ROUTING_0_4_ALPHA.md", "# 0.4 Alpha Multi-Surface Routing\n\nCurrent bilingual advisory-safety research.\n"],
        ["docs/research/MULTI_SURFACE_EVIDENCE_ROUTING_0_3_0.md", "# Multi-Surface Evidence Routing 0.3.0\n\nHistoric bilingual multi-surface routing research with advisory-safety machine evidence behavior, implementation details, focused regression tests, and generated MCP verification.\n"],
        ["docs/zh-CN/MULTI_SURFACE_EVIDENCE_ROUTING_0_3_0.md", "# 0.3.0 Multi-Surface Evidence Routing\n\nHistoric bilingual advisory-safety machine evidence and routing research.\n"]
      ]);
      for (const [relativePath, source] of sources) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const task = "Improve bilingual multi-surface routing research docs while preserving advisory-safety machine evidence behavior.";
      const route = await routePalace(root, task, { routeLimit: 4, budget: 6000 });
      const routed = route.route.map((step) => step.sourcePath.replace(/:\d+(?:-\d+)?$/, ""));

      expect(classifyTask(task)).toBe("refactor");
      expect(routed).toEqual(expect.arrayContaining([
        "docs/research/MULTI_SURFACE_ROUTING_0_4_ALPHA.md",
        "docs/zh-CN/MULTI_SURFACE_ROUTING_0_4_ALPHA.md"
      ]));
    });
  });

  it("calibrates broad-task confidence from surface coverage and route focus", async () => {
    await withFixture("ts-api", async (root) => {
      await indexPalace(root);

      const route = await routePalace(
        root,
        "Improve Vertex Palace 0.3.0 focused bugfix routing precision, preserve recall, calibrate broad-task confidence, strengthen strict real-repository validation, and update generated MCP distribution",
        { routeLimit: 10 }
      );

      expect(route.confidence).toBeGreaterThan(0.35);
      expect(route.confidence).toBeLessThan(1);
    });
  });

  it("caps confidence for a compound multi-surface bugfix even when route surfaces are represented", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        [
          "packages/core/src/router/route-planner.ts",
          "export function repairBoundedMultiSurfaceRoute() { return ['implementation', 'test', 'shared']; }\n"
        ],
        [
          "packages/core/src/router/route-scorer.ts",
          "export function calibrateRouteConfidence() { return { adaptive: true, telemetry: true }; }\n"
        ],
        [
          "packages/core/src/packer/context-packer.ts",
          "export function normalizeContextTelemetry() { return { mode: 'adaptive' }; }\n"
        ],
        [
          "packages/shared/src/types.ts",
          "export type SharedContextContract = { implementation: string; test: string };\n"
        ],
        [
          "packages/core/test/router.test.ts",
          "test('bounded multi-surface implementation pairing', () => true);\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);
      const task = "Repair routing failures with bounded multi-surface implementation and test pairing, calibrated confidence, normalized context telemetry, adaptive mode behavior, and shared transport contracts.";
      const analysis = analyzeTask(task);
      const route = await routePalace(root, task, { routeLimit: 24, budget: 16000 });

      expect(classifyTask(task)).toBe("bugfix");
      expect(requestedRouteSurfaces(analysis)).toEqual(expect.arrayContaining(["implementation", "test", "shared"]));
      expect(route.confidence).toBeLessThanOrEqual(0.4);
    });
  });

  it("does not turn package parser or evidence-router implementation terms into artifact surfaces", () => {
    const analysis = analyzeTask(
      "Add structured package.json workspace metadata and machine-readable evidence routing with parser regressions"
    );

    expect(requestedRouteSurfaces(analysis)).not.toContain("package");
    expect(requestedRouteSurfaces(analysis)).not.toContain("evidence");
    expect(requestedRouteSurfaces(analyzeTask(
      "Preserve the current machine-readable evaluation evidence in the control-first report"
    ))).toContain("evidence");
  });

  it("routes bilingual evidence synchronization across its plan, generator, test, and documentation surfaces", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "src/commands/study.mjs",
        "test/study.test.mjs",
        "results/control-first-v3/plan.json",
        "docs/research/CONTROL_FIRST_V3_PREFLIGHT.md",
        "docs/research/PROTOCOL_V3.md",
        "docs/zh-CN/PROTOCOL_V3.md",
        "README.md",
        "docs/zh-CN/README.md"
      ];
      const sources = new Map<string, string>([
        ["src/commands/study.mjs", "export function buildControlFirstPlan() { return { frozen: false, sourceCommit: 'candidate' }; }\n"],
        ["test/study.test.mjs", "test('control-first source commit and frozen plan', () => true);\n"],
        ["results/control-first-v3/plan.json", JSON.stringify({ frozen: false, sourceCommit: "candidate", trials: 16 })],
        ["docs/research/CONTROL_FIRST_V3_PREFLIGHT.md", "# Control-First v3 Preflight\n\nProduct evidence commit and context ceiling gate.\n"],
        ["docs/research/PROTOCOL_V3.md", "# Protocol v3\n\nThe plan remains frozen false with zero outcomes.\n"],
        ["docs/zh-CN/PROTOCOL_V3.md", "# v3 协议\n\n计划保持 frozen false，公开结果为零。\n"],
        ["README.md", "# Benchmark\n\nControl-first product evidence and protocol summary.\n"],
        ["docs/zh-CN/README.md", "# 简体中文说明\n\nControl-first 产品证据与协议摘要。\n"],
        ["docs/research/PROTOCOL_V2.md", "# Protocol v2\n\nSuperseded control-first protocol.\n"],
        ["docs/research/PROTOCOL_V2_2.md", "# Protocol v2.2\n\nSuperseded memory protocol.\n"],
        ["docs/research/evidence/guarded-stale-memory-v2.2-trial01.json", JSON.stringify({ trial: 1, status: "historic" })],
        ["docs/research/evidence/guarded-stale-memory-v2.2-trial02.json", JSON.stringify({ trial: 2, status: "historic" })],
        [
          "docs/research/evidence/vertex-palace-0.3.0-sync-evaluation.json",
          JSON.stringify({ schemaVersion: 1, claimBoundary: "pin-sync route evaluation only", sourceCommit: "candidate" })
        ],
        ["results/adaptive-pilot-v2.2/README.md", "# Historic adaptive pilot\n\nSuperseded result notes.\n"],
        [".github/workflows/ci.yml", "name: CI\non: [push]\njobs: { test: { runs-on: ubuntu-latest } }\n"],
        ["analysis/paired-analysis.mjs", "export function reportedTokenPrecisionAnalysis() { return 'paired benchmark precision'; }\n"],
        ["analysis/power-analysis.mjs", "export function benchmarkPower() { return 'analysis only'; }\n"]
      ]);
      for (const [relativePath, source] of sources) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const task = "同步 Vertex Palace v0.3 最终源码与证据提交，更新严格真实仓库精度和高密度记忆预算验证，并保留 control-first 冻结边界与简体中文说明";
      const analysis = analyzeTask(task);
      const evaluation = await evaluateRoute(root, task, {
        changedFiles,
        budget: 5000,
        routeLimit: 6,
        maxDrawers: 4
      });

      expect(classifyTask(task)).toBe("evaluation");
      expect(classifyTask("修正多表面证据同步路由并排除旧协议")).toBe("bugfix");
      expect(analysis.keywords).toEqual(expect.arrayContaining([
        "implementation",
        "evidence",
        "precision",
        "memory",
        "context",
        "token",
        "protocol",
        "plan",
        "config",
        "docs",
        "readme",
        "bilingual"
      ]));
      expect(requestedRouteSurfaces(analysis)).toEqual(expect.arrayContaining([
        "implementation",
        "test",
        "config",
        "docs"
      ]));
      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.files).not.toEqual(expect.arrayContaining([
        "analysis/paired-analysis.mjs",
        "analysis/power-analysis.mjs",
        "docs/research/PROTOCOL_V2.md",
        "docs/research/PROTOCOL_V2_2.md",
        "docs/research/evidence/guarded-stale-memory-v2.2-trial01.json",
        "docs/research/evidence/guarded-stale-memory-v2.2-trial02.json",
        "results/adaptive-pilot-v2.2/README.md",
        ".github/workflows/ci.yml"
      ]));
      expect(evaluation.route.fileCount).toBeLessThanOrEqual(10);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.8);
      expect(evaluation.route.confidence).toBeGreaterThan(0.35);
      expect(evaluation.calibration.status).not.toBe("overconfident");

      const pinTask = "同步 Vertex Palace 产品源码、研究证据与 CI 到 control-first v3 计划、英文协议、简体中文协议和 README；保留 frozen false 与零 Agent outcomes";
      const pinAnalysis = analyzeTask(pinTask);
      const pinEvaluation = await evaluateRoute(root, pinTask, {
        changedFiles,
        budget: 5000,
        routeLimit: 6,
        maxDrawers: 4
      });

      expect(classifyTask(pinTask)).toBe("evaluation");
      expect(requestedRouteSurfaces(pinAnalysis)).toEqual(expect.arrayContaining([
        "implementation",
        "test",
        "config",
        "docs",
        "ci"
      ]));
      expect(pinEvaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(pinEvaluation.route.files).toContain(".github/workflows/ci.yml");
      expect(pinEvaluation.route.fileCount).toBeLessThanOrEqual(9);
      expect(pinEvaluation.coverage.changedFileCoverage).toBe(1);
      expect(pinEvaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.88);

      const postUpdateFiles = [
        ...changedFiles,
        "docs/research/evidence/vertex-palace-0.3.0-sync-evaluation.json"
      ];
      const postUpdateTask = "Pin Vertex Palace 0.3.0 in the control-first study generator, focused test, frozen plan, bilingual protocol and README; preserve the current machine-readable evaluation evidence while excluding historical v2.2 trials";
      const postUpdateAnalysis = analyzeTask(postUpdateTask);
      const postUpdateEvaluation = await evaluateRoute(root, postUpdateTask, {
        changedFiles: postUpdateFiles,
        budget: 5000,
        routeLimit: 6,
        maxDrawers: 4
      });

      expect(requestedRouteSurfaces(postUpdateAnalysis)).toEqual(expect.arrayContaining([
        "implementation",
        "test",
        "config",
        "docs",
        "evidence"
      ]));
      expect(postUpdateEvaluation.route.files).toEqual(expect.arrayContaining(postUpdateFiles));
      expect(postUpdateEvaluation.route.files).not.toEqual(expect.arrayContaining([
        "docs/research/evidence/guarded-stale-memory-v2.2-trial01.json",
        "docs/research/evidence/guarded-stale-memory-v2.2-trial02.json",
        "results/adaptive-pilot-v2.2/plan.json"
      ]));
      expect(postUpdateEvaluation.coverage.changedFileCoverage).toBe(1);
      expect(postUpdateEvaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.8);
    });
  });

  it("covers implementation, regression, package, plugin, and release records for a release task", async () => {
    await withFixture("ts-api", async (root) => {
      const sources = new Map<string, string>([
        [".agents/plugins/marketplace.json", JSON.stringify({ plugins: [{ source: { ref: "v0.2.2" } }] })],
        ["BUILD_WEEK.md", "# Vertex Palace Build Week\n\nRelease verification and public installation.\n"],
        ["CHANGELOG.md", "# Changelog\n\n## 0.2.2\n\nAdaptive Full Palace memory delivery.\n"],
        ["README.md", "# Vertex Palace\n\nInstall the npm package and Codex plugin.\n"],
        ["docs/research/ADAPTIVE_MEMORY_FIX_0_2_2.md", "# Adaptive Full-Palace Memory Fidelity Fix\n\n## Release Verification\n"],
        ["package.json", JSON.stringify({ name: "vertex-palace", version: "0.2.2" })],
        ["packages/cli/package.json", JSON.stringify({ name: "@vertex-palace/cli", version: "0.2.2" })],
        ["packages/cli/src/index.ts", "export const cliVersion = '0.2.2 release';\n"],
        ["packages/core/package.json", JSON.stringify({ name: "@vertex-palace/core", version: "0.2.2" })],
        ["packages/core/src/packer/context-packer.ts", "export function packAdaptiveFullPalaceMemory() { return 'adaptive full palace context packer scoped memory delivery'; }\n"],
        ["packages/core/src/router/mode-selector.ts", "export function selectAdaptiveFullPalaceMode() { return 'adaptive mode selector full palace memory'; }\n"],
        ["packages/core/test/context.test.ts", "describe('adaptive context packer memory regression', () => it('delivers memory', () => true));\n"],
        ["packages/core/test/mode-selector.test.ts", "describe('adaptive mode selector release regression', () => it('selects full palace', () => true));\n"],
        ["packages/mcp/package.json", JSON.stringify({ name: "@vertex-palace/mcp", version: "0.2.2" })],
        ["packages/mcp/src/server.ts", "export const mcpServerVersion = '0.2.2 public plugin release';\n"],
        ["packages/shared/package.json", JSON.stringify({ name: "@vertex-palace/shared", version: "0.2.2" })],
        ["plugins/vertex-palace/.codex-plugin/plugin.json", JSON.stringify({ name: "vertex-palace", version: "0.2.2" })],
        ["plugins/vertex-palace/.mcp.json", JSON.stringify({ mcpServers: { "vertex-palace": { args: ["vertex-palace@0.2.2"] } } })],
        ["plugins/vertex-palace/mcp/server.cjs", "const version = '0.2.2';\n"]
      ]);
      for (const [relativePath, source] of sources) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(root, RELEASE_TASK, {
        changedFiles: [...RELEASE_CHANGED_FILES],
        budget: 12000,
        routeLimit: 12,
        maxDrawers: 4
      });
      const routed = evaluation.route.files;

      if (process.env.RELEASE_ROUTING_REPORT === "1") {
        process.stdout.write(`${JSON.stringify({
          name: "R1-vertex-palace-replication",
          taskType: evaluation.taskType,
          routeFiles: evaluation.route.files,
          changedFileCoverage: evaluation.coverage.changedFileCoverage,
          routeFocus: evaluation.coverage.routeFocus,
          confidence: evaluation.route.confidence,
          calibration: evaluation.calibration
        })}\n`);
      }

      expect(evaluation.taskType).toBe("release");
      expect(routed).toContain("packages/core/src/packer/context-packer.ts");
      expect(routed).toContain("packages/core/src/router/mode-selector.ts");
      expect(routed.some((file) => /^packages\/core\/test\/(?:context|mode-selector)\.test\.ts$/.test(file))).toBe(true);
      expect(routed).toContain("package.json");
      expect(routed).toContain("plugins/vertex-palace/.mcp.json");
      expect(routed.some((file) => file === "CHANGELOG.md" || file === "docs/research/ADAPTIVE_MEMORY_FIX_0_2_2.md")).toBe(true);
      expect(evaluation.coverage.changedFileCoverage).toBeGreaterThanOrEqual(0.5);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.6);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("routes evaluation feedback to Palace internals instead of nested application source", async () => {
    await withFixture("ts-api", async (root) => {
      await mkdir(path.join(root, "packages", "core", "src", "router"), { recursive: true });
      await mkdir(path.join(root, "packages", "core", "src", "memory"), { recursive: true });
      await mkdir(path.join(root, "vve-dashboard-language", "backend", "src", "services"), { recursive: true });
      await mkdir(path.join(root, "vve-dashboard-language", "scripts"), { recursive: true });
      await mkdir(path.join(root, "vve-dashboard-language", "shared"), { recursive: true });
      await writeFile(
        path.join(root, "packages", "core", "src", "router", "route-planner.ts"),
        `export function routeConfidenceForEvaluation() {
  return "confidence route evaluation retrospective";
}
`,
        "utf8"
      );
      await writeFile(
        path.join(root, "packages", "core", "src", "memory", "write-memory.ts"),
        `export function bindLatestRouteMemory() {
  return "memory route binding retrospective";
}
`,
        "utf8"
      );
      await writeFile(
        path.join(root, "vve-dashboard-language", "backend", "src", "services", "tenant-binding.service.ts"),
        `export function tenantBinding() {
  return "tenant route binding service";
}
`,
        "utf8"
      );
      await writeFile(
        path.join(root, "vve-dashboard-language", "scripts", "lint-admin-route-gates.mjs"),
        `export function lintAdminRouteGates() {
  return "route confidence gates";
}
`,
        "utf8"
      );
      await writeFile(
        path.join(root, "vve-dashboard-language", "shared", "html-sanitizer.ts"),
        `export function sanitizeContextHtml() {
  return "context pack sanitizer";
}
`,
        "utf8"
      );
      await indexPalace(root);

      const route = await routePalace(root, "overall evaluation retrospective score route confidence tenant binding", { routeLimit: 8 });
      const joined = route.route.map((step) => step.sourcePath).join("\n");

      expect(route.taskType).toBe("evaluation");
      expect(route.confidence).toBeLessThan(1);
      expect(joined).toContain("packages/core/src/router/route-planner.ts");
      expect(joined).toContain("packages/core/src/memory/write-memory.ts");
      expect(joined).not.toContain("vve-dashboard-language/backend/src/services/tenant-binding.service.ts");
      expect(joined).not.toContain("vve-dashboard-language/scripts/lint-admin-route-gates.mjs");
      expect(joined).not.toContain("vve-dashboard-language/shared/html-sanitizer.ts");
    });
  });

  it("routes a Codex usage audit through its collector, summarizer, report, and machine evidence", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "scripts/research/audit-codex-palace-usage.cjs",
        "scripts/research/summarize-codex-palace-usage-audit.cjs",
        "docs/research/CODEX_SESSION_USAGE_AUDIT.md",
        "docs/research/evidence/codex-palace-usage-audit.json",
        "docs/research/evidence/codex-palace-usage-summary.json"
      ];
      const sources = new Map<string, string>([
        [changedFiles[0], "export function collectCodexSessionUsageAudit() { return 'Vertex Palace usage reliability audit'; }\n"],
        [changedFiles[1], "export function summarizeCodexPalaceUsageAudit() { return 'aggregate session reliability evidence'; }\n"],
        [changedFiles[2], "# Vertex Palace Codex Session Usage Audit\n\nAnalyze every conversation and report reliability.\n"],
        [changedFiles[3], JSON.stringify({ schemaVersion: 1, kind: "codex-palace-usage-audit", sessions: 66 })],
        [changedFiles[4], JSON.stringify({ schemaVersion: 1, kind: "codex-palace-usage-summary", reliability: 0.7 })],
        ["frontend/pages/palace.tsx", "export default function PalaceMarketingPage() { return null; }\n"],
        ["backend/services/session-usage.ts", "export const applicationSessionUsage = 'unrelated product analytics';\n"]
      ]);
      for (const [relativePath, source] of sources) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const task = "分析所有可访问的 Codex 对话中 Vertex Palace 的真实使用状况，量化可靠性并提出优化方向";
      const route = await routePalace(root, task, { routeLimit: 8 });
      const routed = route.route.map((step) => step.sourcePath.replace(/:\d+(?:-\d+)?$/, ""));

      expect(route.taskType).toBe("evaluation");
      expect(routed).toEqual(expect.arrayContaining(changedFiles));
      expect(routed).not.toContain("frontend/pages/palace.tsx");
      expect(routed).not.toContain("backend/services/session-usage.ts");
      expect(route.intent).toMatchObject({
        requiredRoles: expect.arrayContaining(["implementation", "documentation", "verification"]),
        preferredScopes: expect.arrayContaining(["tooling", "documentation"])
      });
      expect(route.evidenceClosure?.coveredRoles).toEqual(
        expect.arrayContaining(["implementation", "documentation", "verification"])
      );
    });
  });

  it("refreshes a stale index before planning a route", async () => {
    await withFixture("ts-api", async (root) => {
      await indexPalace(root);
      await writeFile(
        path.join(root, "src", "services", "report.service.ts"),
        `import { formatResult } from "../utils/formatter";
export function buildReportService() {
  return formatResult("fresh report service");
}
`,
        "utf8"
      );
      await mkdir(path.join(root, "src", "utils"), { recursive: true });
      await writeFile(path.join(root, "src", "utils", "formatter.ts"), `export const formatResult = (value: string) => value;\n`, "utf8");

      const route = await routePalace(root, "implement fresh report service", { routeLimit: 8 });
      const joined = route.route.map((step) => step.sourcePath).join("\n");

      expect(joined).toContain("src/services/report.service.ts");
      expect(joined).toContain("src/utils/formatter.ts");
    });
  });

  it("understands Chinese optimization tasks and full-stack hints", () => {
    const task = "提升 商品规格 图片上传 前端 后端 接口 路由";
    const analysis = analyzeTask(task);

    expect(classifyTask(task)).toBe("refactor");
    expect(analysis.keywords).toEqual(expect.arrayContaining(["product", "variant", "image", "upload", "frontend", "backend", "api"]));
    expect(analysis.wingHints).toEqual(expect.arrayContaining(["product", "image", "upload", "frontend", "backend", "api"]));
  });

  it("routes large-project feedback terms toward router, classifier, packer, and indexer code", () => {
    const task = "大型全栈项目反馈：提升跨前后端依赖完整度、文件与 Symbol 路由准确度、减少 unknown 任务、控制 pack 输出长度、改善 CLI MCP 使用便利性、索引新鲜度管理";
    const analysis = analyzeTask(task);

    expect(classifyTask(task)).toBe("refactor");
    expect(analysis.keywords).toEqual(expect.arrayContaining(["frontend", "backend", "dependency", "classify", "analyze", "route", "router", "pack", "cli", "mcp", "index", "stale"]));
    expect(analysis.keywords).not.toContain("unknown");
  });

  it("removes generic optimization prose while preserving Palace subsystem intent", () => {
    const analysis = analyzeTask(
      "Optimize Vertex Palace core scanner and router: exclude nested worktrees and unrelated copies, improve index freshness, context pack quality, memory deduplication, pitfall relevance, and CLI reliability"
    );

    expect(analysis.keywords).toEqual(expect.arrayContaining(["scanner", "ignore", "router", "index", "stale", "pack", "packer", "memory", "pitfall", "cli"]));
    expect(analysis.keywords).not.toEqual(expect.arrayContaining(["optimize", "quality", "relevance", "reliability", "unrelated", "copies", "core", "repository", "product"]));
  });

  it("does not treat Build Week or plain evaluation as unrelated subsystem hints", () => {
    const analysis = analyzeTask("Build Week route evaluation through shared CLI MCP tests documentation and CI");

    expect(analysis.keywords).not.toEqual(expect.arrayContaining(["build", "frontend", "page", "component", "memory", "retrospective"]));
    expect(analysis.entities).toEqual(expect.arrayContaining(["build-week", "buildweek"]));
  });

  it("recognizes a Simplified Chinese research report as documentation evidence", () => {
    const analysis = analyzeTask("补齐英文与简体中文研究报告和机器证据，记录真实测试结果");

    expect(analysis.keywords).toEqual(expect.arrayContaining(["docs", "documentation", "evidence", "test"]));
    expect(requestedRouteSurfaces(analysis)).toEqual(expect.arrayContaining(["docs", "evidence", "test"]));
  });

  it("routes measurable evaluation work toward the evaluation subsystem", async () => {
    await withFixture("ts-api", async (root) => {
      const files = [
        [
          "packages/core/src/evaluation/evaluate-route.ts",
          `export function evaluateRouteCoverage() {
  return "evaluation report changed-file coverage confidence calibration token reduction";
}
`
        ],
        ["packages/cli/src/commands/evaluate.ts", `export const evaluateCommand = "CLI evaluation command";\n`],
        ["packages/mcp/src/tools/definitions.ts", `export const palaceEvaluateTool = "MCP evaluation tool";\n`],
        ["packages/shared/src/types.ts", `export type EvaluationReport = { coverage: number };\n`],
        ["packages/core/test/evaluation.test.ts", `describe("evaluation", () => it("measures coverage", () => true));\n`],
        ["packages/core/src/indexer/build-nodes.ts", `export const buildNodes = "generic index builder";\n`],
        ["packages/cli/src/commands/memory.ts", `export const memoryCommand = "unrelated memory command";\n`],
        [".github/workflows/ci.yml", `name: evaluation CI workflow\n`],
        ["BUILD_WEEK.md", `# Build Week evaluation documentation\n`]
      ] as const;
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const route = await routePalace(
        root,
        "build evaluation report for changed-file coverage and confidence calibration through shared types, CLI, MCP, regression tests, documentation, and CI workflow",
        { routeLimit: 4 }
      );

      const joined = route.route.map((step) => step.sourcePath).join("\n");

      expect(joined).toContain("packages/core/src/evaluation/evaluate-route.ts");
      expect(joined).toContain("packages/cli/src/commands/evaluate.ts");
      expect(joined).toContain("packages/mcp/src/tools/definitions.ts");
      expect(joined).toContain("packages/shared/src/types.ts");
      expect(joined).toContain("packages/core/test/evaluation.test.ts");
      expect(joined).toContain("BUILD_WEEK.md");
      expect(joined).toContain(".github/workflows/ci.yml");
      expect(joined).not.toContain("packages/core/src/indexer/build-nodes.ts");
      expect(joined).not.toContain("packages/cli/src/commands/memory.ts");
    });
  });

  it("keeps routed context diverse and avoids duplicate file and symbol entries", async () => {
    await withFixture("ts-api", async (root) => {
      const files = [
        ["packages/core/src/scanner/scan-repo.ts", "export function scanRepo() { return 'scanner ignore worktree'; }"],
        ["packages/core/src/packer/context-packer.ts", "export function packContext() { return 'context pack'; }"],
        ["packages/core/src/router/route-planner.ts", "export function routePalace() { return 'route index freshness'; }"],
        ["packages/core/src/memory/pitfall-board.ts", "export function pitfallBoard() { return 'memory pitfall deduplication'; }"],
        ["packages/cli/src/index.ts", "export function palaceCli() { return 'cli reliability'; }"]
      ] as const;
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const route = await routePalace(root, "Fix scanner worktree ignores, context pack routing, memory pitfall deduplication, index freshness, and CLI reliability", { routeLimit: 8 });
      const sourcePaths = route.route.map((step) => step.sourcePath.split(":")[0]);

      expect(sourcePaths).toContain("packages/core/src/scanner/scan-repo.ts");
      expect(sourcePaths).toContain("packages/core/src/packer/context-packer.ts");
      expect(new Set(sourcePaths).size).toBe(sourcePaths.length);
    });
  });

  it("does not let fixture services outrank router code for feedback tasks", async () => {
    await withFixture("ts-api", async (root) => {
      await mkdir(path.join(root, "packages", "core", "src", "router"), { recursive: true });
      await mkdir(path.join(root, "packages", "core", "test", "fixtures", "demo", "src", "services"), { recursive: true });
      await writeFile(
        path.join(root, "packages", "core", "src", "router", "classify-task.ts"),
        `export function classifyTask(task: string) {
  return task.includes("unknown") ? "unknown" : "refactor";
}
`,
        "utf8"
      );
      await writeFile(
        path.join(root, "packages", "core", "src", "router", "route-scorer.ts"),
        `export function scoreRouteDependency(task: string) {
  return task.includes("frontend") && task.includes("backend");
}
`,
        "utf8"
      );
      await writeFile(
        path.join(root, "packages", "core", "test", "fixtures", "demo", "src", "services", "token.service.ts"),
        `export function fixtureBackendService() {
  return "service";
}
`,
        "utf8"
      );
      await indexPalace(root);

      const route = await routePalace(root, "大型全栈项目反馈：提升跨前后端依赖完整度、文件与 Symbol 路由准确度、减少 unknown 任务", { routeLimit: 8 });
      const joined = route.route.map((step) => step.sourcePath).join("\n");

      expect(joined).toContain("packages/core/src/router/classify-task.ts");
      expect(joined).toContain("packages/core/src/router/route-scorer.ts");
      expect(joined).not.toContain("packages/core/test/fixtures/demo/src/services/token.service.ts");
    });
  });

  it("routes login refresh token bugs to auth, token, and verification context", async () => {
    await withFixture("ts-api", async (root) => {
      await indexPalace(root);
      const task = "fix login refresh token bug";
      const analysis = analyzeTask(task);
      const route = await routePalace(root, task);
      const joined = route.route.map((step) => step.sourcePath).join("\n");
      const sourcePaths = route.route.map((step) => step.sourcePath.split(":")[0]);

      expect(route.taskType).toBe("bugfix");
      expect(analysis.keywords).not.toEqual(expect.arrayContaining(["index", "stale", "fresh"]));
      expect(new Set(sourcePaths)).toEqual(new Set([
        "src/controllers/auth.controller.ts",
        "src/services/token.service.ts",
        "tests/auth.e2e.test.ts"
      ]));
      expect(route.route.every((step) => step.reason.length > 0)).toBe(true);
      expect(route.route.every((step) => step.loadLevel)).toBe(true);
      expect(route.excluded.some((item) => /payment|admin/.test(item.sourcePath))).toBe(true);
      expect(route.budget.estimatedTokens).toBeLessThanOrEqual(route.budget.maxInputTokens);

      const optimizedRoute = await readFile(path.join(root, ".palace", "routes", "optimized-route.txt"), "utf8");
      const latestRoute = JSON.parse(await readFile(path.join(root, ".palace", "routes", "latest-route.json"), "utf8")) as { id: string; task: string };
      expect(optimizedRoute).toContain("fix login refresh token bug");
      expect(latestRoute.id).toBe(route.id);
      expect(latestRoute.task).toBe("fix login refresh token bug");
    });
  });

  it("keeps configuration migration documents in focused bugfix routes", async () => {
    await withFixture("ts-api", async (root) => {
      const sources = new Map<string, string>([
        ["src/scheduler/batch-scheduler-v2.ts", "export function scheduleV2Batch() { return 'scheduler-v2'; }\n"],
        ["src/scheduler/batch-scheduler-v1.ts", "export function scheduleV1Batch() { return 'scheduler-v1 legacy'; }\n"],
        ["src/config/scheduler-config-loader.ts", "export function loadSchedulerV2Config() { return 'scheduler-v2'; }\n"],
        ["config/scheduler-v2.json", JSON.stringify({ schedulerVersion: 2, batchSize: 20 })],
        ["docs/configuration-migration.md", "# Scheduler configuration migration\n\nVersion 2 replaces the legacy scheduler-v1 keys.\n"],
        ["tests/batch-scheduler-v2.test.ts", "describe('scheduler v2 batch', () => it('loads migrated configuration', () => true));\n"]
      ]);
      for (const [relativePath, source] of sources) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const task = "Fix the v2 batch scheduler now that the configuration migration is complete.";
      const analysis = analyzeTask(task);
      const route = await routePalace(root, task, { routeLimit: 6 });
      const routed = route.route.map((step) => step.sourcePath.replace(/:\d+(?:-\d+)?$/, ""));

      expect(requestedRouteSurfaces(analysis)).toEqual(expect.arrayContaining(["config", "docs"]));
      expect(routed).toContain("src/scheduler/batch-scheduler-v2.ts");
      expect(routed).toContain("config/scheduler-v2.json");
      expect(routed).toContain("docs/configuration-migration.md");
      expect(routed).not.toContain("README.md");
    });
  });

  it("does not pull unrelated verification tests into bugfix routes", async () => {
    await withFixture("ts-api", async (root) => {
      const testsDir = path.join(root, "tests");
      await mkdir(testsDir, { recursive: true });
      await writeFile(
        path.join(testsDir, "payment.e2e.test.ts"),
        `describe("payment rules", () => it("requires complete payment credentials", () => expect(true).toBe(true)));\n`,
        "utf8"
      );
      await indexPalace(root);

      const route = await routePalace(root, "fix login refresh token bug", { routeLimit: 12 });
      const joined = route.route.map((step) => step.sourcePath).join("\n");

      expect(joined).toMatch(/auth\.e2e/);
      expect(joined).not.toMatch(/payment\.e2e/);
    });
  });

  it("keeps frontend and backend files in mixed Chinese full-stack routes", async () => {
    await withFixture("ts-api", async (root) => {
      await mkdir(path.join(root, "frontend", "src", "pages", "products"), { recursive: true });
      await mkdir(path.join(root, "backend", "src", "controllers"), { recursive: true });
      await mkdir(path.join(root, "backend", "src", "services"), { recursive: true });
      await writeFile(
        path.join(root, "frontend", "src", "pages", "products", "variant-images.tsx"),
        `export function VariantImageUploader() {
  return <form aria-label="product variant image upload">Upload product variant image</form>;
}
`,
        "utf8"
      );
      await writeFile(
        path.join(root, "backend", "src", "controllers", "product-image.controller.ts"),
        `import { saveProductVariantImage } from "../services/product-image.service";

export function uploadProductVariantImageController(file: File) {
  return saveProductVariantImage(file);
}
`,
        "utf8"
      );
      await writeFile(
        path.join(root, "backend", "src", "services", "product-image.service.ts"),
        `export function saveProductVariantImage(file: File) {
  return { file, status: "stored" };
}
`,
        "utf8"
      );
      await indexPalace(root);

      const route = await routePalace(root, "提升 商品规格 图片上传 前端 后端 接口 路由", { routeLimit: 12 });
      const joined = route.route.map((step) => step.sourcePath).join("\n");

      expect(route.taskType).toBe("refactor");
      expect(joined).toContain("frontend/src/pages/products/variant-images.tsx");
      expect(joined).toContain("backend/src/controllers/product-image.controller.ts");
      expect(joined).toContain("backend/src/services/product-image.service.ts");
    });
  });

  it("pairs a camelCase implementation symbol with its hyphenated focused test without filling routeLimit", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = ["lib/route.js", "test/find-route.test.js"];
      const files = new Map<string, string>([
        [
          "lib/route.js",
          "export function findRoute(options) { return router.find(options.method, options.url); }\n"
        ],
        [
          "test/find-route.test.js",
          "test('findRoute normalizes method before finding a route', () => findRoute({ method: 'get' }));\n"
        ],
        ["lib/four-oh-four.js", "export function findRouteFallback(method) { return method ? null : undefined; }\n"],
        ["test/route-prefix.test.js", "test('route prefix', () => true);\n"],
        [
          "test/route-hooks.test.js",
          "import { findRoute } from '../lib/route.js';\ntest('route hooks call the router', () => findRoute({ method: 'get' }));\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(root, "fix: normalize method in findRoute", {
        changedFiles,
        routeLimit: 9,
        budget: 6000,
        maxDrawers: 4
      });

      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.fileCount).toBe(2);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBe(1);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("stops a root-level completion bug route after the matching implementation and test pair", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = ["completions.go", "completions_test.go"];
      const files = new Map<string, string>([
        ["completions.go", "package cobra\nfunc getCompletions(args []string) []string { return append(args, \"--\") }\n"],
        ["completions_test.go", "package cobra\nfunc TestCompletionDoesNotMutateOsArgs(t *testing.T) {}\n"],
        [
          "powershell_completions_test.go",
          "package cobra\nfunc TestPowerShellCompletions(t *testing.T) { getCompletions([]string{}) }\n"
        ],
        ["powershell_completions.go", "package cobra\nfunc powershellCompletions(args []string) []string { return append(args, \"--\") }\n"],
        ["fish_completions.go", "package cobra\nfunc fishCompletions(args []string) []string { return args }\n"],
        ["bash_completions.go", "package cobra\nfunc bashCompletions() string { return \"completion\" }\n"],
        ["command.go", "package cobra\ntype Command struct { Args []string }\n"]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "fix: prevent completions from mutating os.Args via append side effect",
        { changedFiles, routeLimit: 9, budget: 6000, maxDrawers: 4 }
      );
      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.fileCount).toBe(2);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBe(1);
    });
  });

  it("pairs a package entry point with its conventional root integration test", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = ["lib/index.js", "test/test.js"];
      const files = new Map<string, string>([
        ["package.json", JSON.stringify({ name: "bounded-router", main: "./lib/index.js" })],
        [
          changedFiles[0],
          "module.exports = function configureMaxAge(options) { return options.maxAge && options.maxAge.toString() }\n"
        ],
        [
          changedFiles[1],
          "const configureMaxAge = require('..')\ntest('omits maxAge unless specified', () => configureMaxAge({}))\n"
        ],
        [
          "test/issue-2.js",
          "test('maxAge issue reproduction without package ownership', () => true)\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "Fix setting maxAge option to 0",
        { changedFiles, routeLimit: 10, budget: 6000, maxDrawers: 4 }
      );

      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.fileCount).toBe(2);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBe(1);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("keeps a conventional root integration test when only the package entry names the exact behavior", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = ["src/lib.rs", "tests/test.rs"];
      const files = new Map<string, string>([
        [
          changedFiles[0],
          "pub struct Build; impl Build { pub fn infer_target_flags(target: &str) -> &str { if target.contains(\"neon\") { \"-mfpu=neon\" } else { \"\" } } }\n"
        ],
        [
          changedFiles[1],
          "mod support; use crate::support::Test; #[test] fn gnu_target_flags() { Test::gnu().target(\"armv7\"); }\n"
        ],
        [
          "tests/support/mod.rs",
          "pub struct Test; impl Test { pub fn gnu() -> Self { Self } pub fn target(self, _: &str) -> Self { self } }\n"
        ],
        ["src/target/parser.rs", "pub fn parse_target_name(value: &str) -> &str { value }\n"]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "fix: infer NEON, not VFPv4, from neon in the target name",
        { changedFiles, routeLimit: 10, budget: 6000, maxDrawers: 4 }
      );

      expect([...evaluation.route.files].sort()).toEqual([...changedFiles].sort());
      expect(evaluation.route.fileCount).toBe(2);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBe(1);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("normalizes an inflected behavior into a same-module implementation and test pair", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = ["lib/clone.js", "test/clone.js"];
      const files = new Map<string, string>([
        [changedFiles[0], "exports.clone = function clone(value) { return structuredClone(value) }\n"],
        [changedFiles[1], "const Hoek = require('..')\ntest('clone inherited errors', () => Hoek.clone(new Error()))\n"],
        ["lib/utils.js", "exports.inherit = function inherit(value) { return value }\n"],
        ["test/index.js", "test('subclassed utility errors', () => true)\n"]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "Fix cloning inherited subclassed errors",
        { changedFiles, routeLimit: 10, budget: 6000, maxDrawers: 4 }
      );

      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.fileCount).toBe(2);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBe(1);
    });
  });

  it("prefers a discriminative same-module test over a keyword-heavy sibling test", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = ["trie.go", "trie_test.go"];
      const files = new Map<string, string>([
        [
          "trie.go",
          "package router\ntype trieNode struct { path string; indices string }\n// trailingSlashRedirect handles a wildcard after a named parameter.\nfunc (n *trieNode) trailingSlashRedirect(path string) bool { return n.path == path || n.indices == \"/\" }\n"
        ],
        [
          "trie_test.go",
          "package router\nfunc TestTrieTrailingSlashRedirect(t *testing.T) { tree := &trieNode{indices: \"/\"}; if !tree.trailingSlashRedirect(\"/vendor/x\") { t.Fatal(\"expected redirect\") } }\n"
        ],
        [
          "router_test.go",
          "package router\nfunc TestRouterRedirectWhenWildcardFollowsNamedParam(t *testing.T) { t.Log(\"support trailing slash redirect wildcard named param\") }\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "Support TSR when wildcard follows named param",
        { changedFiles, routeLimit: 9, budget: 6000, maxDrawers: 4 }
      );
      expect(evaluation.route.files).toEqual(changedFiles);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBe(1);
    });
  });

  it("treats bin entry points as CLI implementation and ignores negation as route evidence", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = ["bin/main.js", "test/unit/bin.test.js"];
      const files = new Map<string, string>([
        [
          "bin/main.js",
          "export async function main(nodeProcess) { return nodeProcess.stdin.read(); }\n"
        ],
        [
          "test/unit/bin.test.js",
          "import { main } from '../../bin/main.js';\ntest('cli reads stdin', () => main(process));\n"
        ],
        ["bin/marked.js", "import { main } from './main.js';\nexport const marked = main;\n"],
        ["src/Parser.ts", "export class Parser { parse(input: string) { return input || 'not parsed'; } }\n"],
        ["src/Renderer.ts", "export class Renderer { render(input: string) { return input ? input : 'not rendered'; } }\n"],
        ["src/Tokenizer.ts", "export class Tokenizer { tokenize(input: string) { return input; } }\n"]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const task = "fix: cli not reading stdin";
      const evaluation = await evaluateRoute(root, task, {
        changedFiles,
        routeLimit: 9,
        budget: 6000,
        maxDrawers: 4
      });

      expect(analyzeTask(task).keywords).not.toContain("not");
      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.fileCount).toBe(2);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBe(1);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("routes platform-specific Python failures through compatibility code and its dependent test", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = ["src/click/_compat.py", "tests/test_utils.py"];
      const files = new Map<string, string>([
        [
          "src/click/_compat.py",
          "import sys\nWIN = sys.platform.startswith('win')\nCYGWIN = sys.platform.startswith('cygwin')\n"
        ],
        [
          "tests/test_utils.py",
          "from click._compat import WIN\ndef test_echo_via_pager():\n    assert WIN is False\n"
        ],
        ["tests/test_compat.py", "def test_platform_flags():\n    assert True\n"],
        ["src/click/testing.py", "def echo_via_pager(value):\n    return value\n"],
        ["src/click/termui.py", "def pager(value):\n    return value\n"],
        ["tests/test_termui.py", "def test_pager():\n    assert True\n"]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const task = "fix: skip flaky pager test on macOS with free-threaded Python";
      const evaluation = await evaluateRoute(root, task, {
        changedFiles,
        routeLimit: 9,
        budget: 6000,
        maxDrawers: 4
      });

      expect(analyzeTask(task).keywords).toContain("compat");
      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.files).not.toContain("tests/test_compat.py");
      expect(evaluation.route.fileCount).toBeLessThanOrEqual(3);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.67);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("caps confidence when a bug report has only ambiguous language and environment matches", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        ["src/tool/testing.py", "def run_in_thread():\n    return 'python worker'\n"],
        ["src/tool/utils.py", "def echo_via_pager(value):\n    return value\n"],
        ["tests/test_termui.py", "def test_pager():\n    assert True\n"]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const route = await routePalace(
        root,
        "fix: skip flaky pager test on macOS with free-threaded Python",
        { routeLimit: 9, budget: 6000 }
      );

      expect(route.confidence).toBeLessThanOrEqual(0.4);
    });
  });

  it("separates confidence from narrowing authorization when an independent anchor is missing", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        [
          "src/payload/escape.ts",
          "export function quotePayload(value: string) { return value.replaceAll('\\n', '\\\\n'); }\n"
        ],
        [
          "test/payload/escape.test.ts",
          "import { quotePayload } from '../../src/payload/escape';\ntest('escaped payload newlines', () => quotePayload('a\\nb'));\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const route = await routePalace(
        root,
        "Fixes payload parsing for escaped newlines",
        { routeLimit: 9, budget: 6000 }
      );

      expect(route.route.map((step) => step.sourcePath.split(":")[0])).toEqual([
        "src/payload/escape.ts",
        "test/payload/escape.test.ts"
      ]);
      expect(route.confidence).toBeGreaterThan(0.15);
      expect(route.narrowingEvidence).toEqual({
        independentImplementationAnchor: "missing",
        leadingTaskAnchors: ["payload", "parsing"],
        reasons: [
          "No selected implementation independently covers both leading bugfix anchors: payload, parsing."
        ]
      });
      const optimizedRoute = await readFile(
        path.join(root, ".palace", "routes", "optimized-route.txt"),
        "utf8"
      );
      expect(optimizedRoute).toContain("Narrowing evidence: missing");
    });
  });

  it("routes object-literal behavior bugs through a transitive source test instead of docs tests", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        [
          "src/sinon/default-behaviors.js",
          `const defaultBehaviors = {
  returns: function returns(fake, value) {
    fake.returnValue = value;
    fake.returnArgAt = undefined;
  },
  returnsArg: function returnsArg(fake, index) {
    fake.returnArgAt = index;
  }
};
export default defaultBehaviors;
`
        ],
        [
          "src/sinon/stub.js",
          `import behaviors from "./default-behaviors.js";
export function createStub() {
  return { returns: behaviors.returns, returnsArg: behaviors.returnsArg };
}
`
        ],
        [
          "test/src/stub-test.js",
          `import { createStub } from "../../src/sinon/stub.js";
describe(".returnsArg", function () {
  it("lets returns override returnsArg", function () {
    const stub = createStub();
    stub.returnsArg(0);
    stub.returns("value");
  });
});
`
        ],
        ["docs/concepts/stubs/api/returns-arg.md", "# returnsArg\nReturn the selected argument.\n"],
        [
          "docs/tests/docs/stubs/api/returns-arg.test.js",
          "test('documents returnsArg', () => expect('returnsArg').toBeTruthy());\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const route = await routePalace(root, "fix: let returns override returnsArg", {
        routeLimit: 9,
        budget: 6000
      });

      expect(route.route.map((step) => step.sourcePath.split(":")[0])).toEqual([
        "src/sinon/default-behaviors.js",
        "test/src/stub-test.js"
      ]);
    });
  });

  it("stops a specific request-method bug after its implementation and exact test", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = ["lib/request.js", "test/req.acceptsCharsets.js"];
      const files = new Map<string, string>([
        ["lib/request.js", "export function acceptsCharsets(request, values) { return request.acceptsCharsets(values); }\n"],
        ["lib/utils.js", "export function acceptParams(value) { return value; }\n"],
        ["test/req.acceptsCharsets.js", "test('req acceptsCharsets handles values', () => true);\n"],
        ["test/req.accepts.js", "test('req accepts media types', () => true);\n"],
        ["test/req.acceptsEncodings.js", "test('req accepts encodings', () => true);\n"],
        ["test/req.acceptsLanguages.js", "test('req accepts languages', () => true);\n"],
        ["test/req.query.js", "test('req query', () => true);\n"],
        ["test/res.format.js", "test('response format', () => true);\n"]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(root, "fix: enhance req.acceptsCharsets method", {
        changedFiles,
        routeLimit: 9,
        budget: 6000,
        maxDrawers: 4
      });

      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.fileCount).toBeLessThanOrEqual(3);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.67);
    });
  });

  it("applies evidence-sufficiency stopping to a feature implementation and focused test", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = ["httpx/_auth.py", "tests/test_auth.py"];
      const files = new Map<string, string>([
        ["httpx/_auth.py", "class DigestAuth:\n    def auth_flow(self, request):\n        response = yield request\n        yield request\n"],
        ["tests/test_auth.py", "import httpx\ndef test_digest_auth_with_401():\n    flow = httpx.DigestAuth().sync_auth_flow(request)\n    flow.send(response)\n"],
        ["tests/client/test_auth.py", "def test_digest_auth_retried_request():\n    request = client.get('/auth')\n    assert request.headers['Authorization'].startswith('Digest')\n"],
        ["httpx/_client.py", "class Client:\n    def send(self, request): return request\n"],
        ["httpx/_api.py", "def request(method, url): return (method, url)\n"],
        ["httpx/_main.py", "def main(): return 'httpx'\n"]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "Add cookies to the retried request when performing digest authentication.",
        { changedFiles, routeLimit: 9, budget: 6000, maxDrawers: 4 }
      );
      expect(evaluation.taskType).toBe("feature");
      expect(evaluation.route.files).toEqual(changedFiles);
      expect(evaluation.route.fileCount).toBe(2);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.67);
    });
  });

  it("prefers the specific completion pair over a generic help-output pair", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = ["completion.go", "completion_test.go"];
      const files = new Map<string, string>([
        ["completion.go", "package cli\nfunc completionSubcommandOrder(items []string) []string { return items }\n"],
        ["completion_test.go", "package cli\nfunc TestCompletionSubcommandOrderDeterministic(t *testing.T) {}\n"],
        ["help.go", "package cli\nfunc renderHelpOutput(items []string) string { return \"help output\" }\n"],
        ["help_test.go", "package cli\nfunc TestHelpOutput(t *testing.T) {}\n"],
        ["command.go", "package cli\ntype Command struct { Name string }\n"]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "fix: keep completion subcommand order deterministic in help output",
        { changedFiles, routeLimit: 9, budget: 6000, maxDrawers: 4 }
      );

      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.files).not.toEqual(expect.arrayContaining(["help.go", "help_test.go"]));
      expect(evaluation.route.fileCount).toBeLessThanOrEqual(3);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("keeps a scoped feature route to its two implementations and focused testsuite", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "clap_complete/src/engine/complete.rs",
        "clap_complete/src/engine/custom.rs",
        "clap_complete/tests/testsuite/engine.rs"
      ];
      const files = new Map<string, string>([
        [changedFiles[0], "use super::ArgValueCompleter;\npub fn complete_arg_value(completer: ArgValueCompleter, value: &str) { completer.complete(value); }\n"],
        [changedFiles[1], "pub struct ArgValueCompleter;\npub trait ValueCompleter { fn complete(&self, current: &str); }\nimpl ArgValueCompleter { pub fn complete(&self, current: &str) {} }\n"],
        [changedFiles[2], "#[test]\nfn suggest_custom_arg_completer_at_index() { let completer: ValueCompleter; assert!(true); }\n"],
        ["clap_complete/src/env/shells.rs", "pub fn complete_shell() {}\n"],
        ["clap_builder/src/builder/value_parser.rs", "pub struct ValueParser;\n"],
        ["tests/builder/multiple_values.rs", "#[test]\nfn multiple_values() {}\n"]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const task = "feat(complete): Index-aware ValueCompleter";
      const analysis = analyzeTask(task);
      const evaluation = await evaluateRoute(root, task, {
        changedFiles,
        routeLimit: 9,
        budget: 6000,
        maxDrawers: 4
      });

      expect(evaluation.taskType).toBe("feature");
      expect(analysis.keywords).toContain("index");
      expect(analysis.keywords).not.toEqual(expect.arrayContaining(["stale", "fresh"]));
      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.fileCount).toBe(3);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.6);
    });
  });

  it("keeps multiple directly named feature tests without filling unrelated command siblings", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "lib/command.js",
        "tests/command.executableSubcommand.mock.test.js",
        "tests/command.executableSubcommand.search.test.js"
      ];
      const files = new Map<string, string>([
        [changedFiles[0], "export function findExecutableSubcommand(name) { return process.platform === 'win32' ? `${name}.exe` : name; }\n"],
        [changedFiles[1], "import { findExecutableSubcommand } from '../lib/command.js';\ntest('missing executable custom message mock', () => findExecutableSubcommand('missing'));\n"],
        [changedFiles[2], "import { findExecutableSubcommand } from '../lib/command.js';\ntest('search missing executable on Windows', () => findExecutableSubcommand('missing'));\n"],
        ["tests/command.executableSubcommand.inspect.test.js", "import { findExecutableSubcommand } from '../lib/command.js';\ntest('inspect executable subcommand', () => findExecutableSubcommand('inspect'));\n"],
        ["tests/command.executableSubcommand.signals.test.js", "import { findExecutableSubcommand } from '../lib/command.js';\ntest('forward executable signals', () => findExecutableSubcommand('signals'));\n"],
        ["tests/command.executableSubcommand.lookup.test.js", "import { findExecutableSubcommand } from '../lib/command.js';\ntest('lookup executable subcommand', () => findExecutableSubcommand('lookup'));\n"],
        ["tests/command.addHelpText.test.js", "test('command add help text', () => true);\n"],
        ["tests/command.addCommand.test.js", "test('command add command', () => true);\n"],
        ["typings/index.d.ts", "export declare class Command {}\n"],
        ["examples/custom-command-class.js", "export class CustomCommand {}\n"]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "Add informative message for missing executable on Windows",
        { changedFiles, routeLimit: 9, budget: 6000, maxDrawers: 4 }
      );

      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.fileCount).toBeLessThanOrEqual(5);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.6);
    });
  });

  it("preserves a capitalized implementation identity and its imported Python regression test", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = ["src/_pytest/main.py", "testing/test_conftest.py"];
      const files = new Map<string, string>([
        [
          changedFiles[0],
          "class Directory:\n    pass\n\nclass Session:\n    def _collect_one_node(self, node, handle_dupes):\n        return self.collection_cache.get(node) if not handle_dupes else node\n\n    def collect(self, directory):\n        return self._collect_one_node(directory, handle_dupes=False)\n\ndef pytest_collect_directory(path):\n    return Directory()\n"
        ],
        [
          changedFiles[1],
          "from _pytest.main import Session\ndef test_conftest_fixture_order_survives_directory_recollection():\n    fixture_identity = object()\n    assert Session().collect(fixture_identity) is fixture_identity\n"
        ],
        ["src/_pytest/hookspec.py", "def pytest_collect_directory(path):\n    return 'fixture directory collection protocol'\n"],
        ["src/_pytest/junitxml.py", "def record_fixture_identity(value): return value\n"],
        [
          "src/_pytest/fixtures.py",
          "def deduplicate_names(values):\n    return tuple(dict.fromkeys(values))\n\nclass FixtureManager:\n    def pytest_collection_finish(self, directory):\n        return directory\n"
        ],
        ["src/_pytest/python.py", "def pytest_collect_directory(path):\n    return 'python fixture directory'\n"],
        [
          "testing/python/fixtures.py",
          "def test_deduplicate_names():\n    assert True\n\ndef test_fixture_directory_collection():\n    assert True\n"
        ],
        ["testing/python/collect.py", "def test_keep_duplicates_for_directory_collection():\n    assert True\n"],
        [
          "testing/test_collection.py",
          "def test_collect_directory_hook():\n    assert True\n\ndef test_duplicate_directory_fixture_collection():\n    assert True\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "fix: deduplicate Directory nodes on re-collection to preserve fixture identity",
        { changedFiles, routeLimit: 9, budget: 6000, maxDrawers: 4 }
      );

      expect(analyzeTask("fix: deduplicate Directory nodes").entities).toContain("directory");
      expect(analyzeTask("fix: deduplicate Directory nodes on re-collection").entities).not.toEqual(
        expect.arrayContaining(["re-collection", "recollection"])
      );
      expect(analyzeTask("fix: deduplicate Directory nodes").keywords).not.toEqual(
        expect.arrayContaining(["memory", "pitfall"])
      );
      expect(evaluation.route.files).toEqual(changedFiles);
      expect(evaluation.route.fileCount).toBe(2);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.5);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("uses an explicit response module identity to reject a request-side implementation and nested test", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = ["lib/response.js", "__tests__/application/response.test.js"];
      const files = new Map<string, string>([
        [
          changedFiles[0],
          "export function setResponseType(ctx, value) { if (Array.isArray(value)) throw new TypeError('one content-type value'); ctx.type = value; }\n"
        ],
        [
          changedFiles[1],
          "import { setResponseType } from '../../lib/response.js';\ntest('should not assign multiple content-type values for a response header', () => setResponseType({}, ['json']));\n"
        ],
        [
          "lib/request.js",
          "export function getRequestType(request) { return request.headers['content-type']; }\n"
        ],
        [
          "__tests__/response/type.test.js",
          "test('request content-type accepts multiple header values', () => true);\n"
        ],
        [
          "__tests__/request/type.test.js",
          "test('request type reads the content-type header', () => true);\n"
        ],
        [
          "docs/api/response.md",
          "# Response API\n\n## response.type\n\nSet the response content-type value.\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "fix: response content-type value amount as one with testcase (#1899)",
        { changedFiles, routeLimit: 9, budget: 6000, maxDrawers: 4 }
      );

      expect(evaluation.route.files).toEqual(changedFiles);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBe(1);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("uses a dotted request receiver to pair request implementation and tests", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = ["starlette/requests.py", "tests/test_requests.py"];
      const files = new Map<string, string>([
        [
          changedFiles[0],
          "class Request:\n    @property\n    def cookies(self):\n        return [value for key, value in self.headers if key == 'cookie']\n"
        ],
        [
          changedFiles[1],
          "from starlette.requests import Request\ndef test_request_cookies_support_multiple_headers():\n    assert Request().cookies == []\n"
        ],
        [
          "starlette/responses.py",
          "class Response:\n    def set_cookie(self, value):\n        self.raw_headers.append(('set-cookie', value))\n"
        ],
        [
          "tests/test_responses.py",
          "from starlette.responses import Response\ndef test_response_multiple_cookie_headers():\n    assert Response()\n"
        ],
        [
          "tests/test_applications.py",
          "def test_application_cookie_header_roundtrip():\n    assert True\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "Support multiple cookie headers in `Request.cookies` (#3029)",
        { changedFiles, routeLimit: 9, budget: 6000, maxDrawers: 4 }
      );

      expect(evaluation.taskType).toBe("feature");
      expect(evaluation.route.files).toEqual(changedFiles);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBe(1);
    });
  });

  it("prefers a colocated generic module test over broad integration tests", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "tower/src/balance/p2c/service.rs",
        "tower/src/balance/p2c/test.rs"
      ];
      const files = new Map<string, string>([
        [
          changedFiles[0],
          "pub struct Balance { cached_ready_index: Option<usize> }\nimpl Balance { fn clear_cached_ready_index_after_discovery_removal(&mut self) { self.cached_ready_index = None; } }\n"
        ],
        [
          changedFiles[1],
          "use super::service::Balance;\n#[test]\nfn discovery_removal_clears_cached_ready_index() { assert!(true); }\n"
        ],
        [
          "tower/tests/balance/main.rs",
          "#[test]\nfn balance_services_after_discovery_change() { assert!(true); }\n"
        ],
        [
          "tower/tests/ready_cache/main.rs",
          "#[test]\nfn ready_cache_tracks_index() { assert!(true); }\n"
        ],
        [
          "tower/src/balance/p2c/worker.rs",
          "pub fn discover_ready_service() -> usize { 0 }\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "fix(balance): clear cached P2C ready index after a discovery removal (#874)",
        { changedFiles, routeLimit: 9, budget: 6000, maxDrawers: 4 }
      );

      expect(evaluation.route.files).toEqual(changedFiles);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBe(1);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("stops an Allow feature after the NameEmail implementation and focused test", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = ["pydantic/networks.py", "tests/test_networks.py"];
      const files = new Map<string, string>([
        [
          changedFiles[0],
          "class NameEmail:\n    def parse(self, value):\n        return value.rsplit(' <', 1)\n"
        ],
        [
          changedFiles[1],
          "from pydantic.networks import NameEmail\ndef test_name_email_allows_periods_in_unquoted_display_name():\n    assert NameEmail().parse('A. Person <a@example.com>')\n"
        ],
        [
          "pydantic/v1/networks.py",
          "class NameEmail:\n    def parse(self, value):\n        return value.split('<', 1)\n"
        ],
        [
          "tests/v1/test_networks.py",
          "from pydantic.v1.networks import NameEmail\ndef test_legacy_name_email_display_name():\n    assert NameEmail()\n"
        ],
        [
          "pydantic/fields.py",
          "class FieldInfo:\n    display_name = 'field'\n"
        ],
        [
          "tests/test_aliases.py",
          "def test_field_display_name_alias():\n    assert True\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const task = "Allow periods in unquoted `NameEmail` display names (#13206)";
      const evaluation = await evaluateRoute(root, task, {
        changedFiles,
        routeLimit: 9,
        budget: 6000,
        maxDrawers: 4
      });

      expect(evaluation.taskType).toBe("feature");
      expect(evaluation.route.files).toEqual(changedFiles);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBe(1);
      expect(evaluation.calibration.status).not.toBe("overconfident");

      const versionedEvaluation = await evaluateRoute(
        root,
        "Allow periods in unquoted v1 `NameEmail` display names",
        {
          changedFiles: ["pydantic/v1/networks.py", "tests/v1/test_networks.py"],
          routeLimit: 9,
          budget: 6000,
          maxDrawers: 4
        }
      );

      expect(versionedEvaluation.route.files).toEqual([
        "pydantic/v1/networks.py",
        "tests/v1/test_networks.py"
      ]);
      expect(versionedEvaluation.coverage.changedFileCoverage).toBe(1);
      expect(versionedEvaluation.coverage.routeFocus).toBe(1);
    });
  });

  it("stops after an explicitly named type and its generic integration test", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = ["src/raw.rs", "tests/test.rs"];
      const files = new Map<string, string>([
        [
          changedFiles[0],
          "pub struct RawValue;\nimpl RawValue { pub unsafe fn from_string_unchecked(value: String) -> Self { RawValue } }\n"
        ],
        [
          changedFiles[1],
          "use serde_json::value::RawValue;\n#[test]\nfn raw_value_from_string_unchecked_preserves_json() { assert!(true); }\n"
        ],
        [
          "src/number.rs",
          "pub struct Number;\nimpl Number { pub fn from_string_unchecked(value: String) -> Self { Number } }\n"
        ],
        [
          "tests/regression/issue845.rs",
          "#[test]\nfn deserialize_integer_or_string() { assert!(true); }\n"
        ],
        [
          "src/value/mod.rs",
          "pub enum Value { String(String), Number(i64) }\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "Add RawValue::from_string_unchecked",
        { changedFiles, routeLimit: 9, budget: 6000, maxDrawers: 4 }
      );

      expect(evaluation.taskType).toBe("feature");
      expect(evaluation.route.files).toEqual(changedFiles);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBe(1);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("uses a requested locale path segment to select the matching translation pair", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "translations/en/messages.go",
        "translations/en/messages_test.go"
      ];
      const files = new Map<string, string>([
        [
          changedFiles[0],
          "package en\nfunc registerPrefixValidator() string { return \"prefix\" }\nfunc registerSuffixValidator() string { return \"suffix\" }\n"
        ],
        [
          changedFiles[1],
          "package en\nfunc TestPrefixAndSuffixValidatorMessages(t *testing.T) {}\n"
        ],
        [
          "translations/de/messages.go",
          "package de\nfunc registerPrefixValidator() string { return \"prefix\" }\nfunc registerSuffixValidator() string { return \"suffix\" }\n"
        ],
        [
          "translations/de/messages_test.go",
          "package de\nfunc TestPrefixAndSuffixValidatorMessages(t *testing.T) {}\n"
        ],
        [
          "translations.go",
          "package validator\nfunc registerTranslations() string { return \"all validator translations\" }\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "Add English translations for prefix and suffix validators",
        { changedFiles, routeLimit: 9, budget: 6000, maxDrawers: 4 }
      );

      expect(evaluation.route.files).toEqual(changedFiles);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBe(1);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("keeps a Python symbol pair focused when the same files have unrelated test edges", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = ["aiohttp/helpers.py", "tests/test_helpers.py"];
      const files = new Map<string, string>([
        [
          changedFiles[0],
          `def parse_mimetype(value: str):
    parts = value.split(";")
    parameters = {item: "" for item in parts[1:] if item}
    return parts[0], parameters

def quoted_string(value: str):
    return value.strip('"')

class CookieMixin:
    def set_cookie(self, name: str, value: str):
        return name, value
`
        ],
        [
          changedFiles[1],
          `from aiohttp.helpers import parse_mimetype

def test_parse_mimetype():
    assert parse_mimetype("text/plain; charset=utf-8")
`
        ],
        [
          "tests/test_cookie_helpers.py",
          `from aiohttp.helpers import quoted_string

def test_unquote_quoted_strings():
    assert quoted_string('"value"') == "value"

def test_parse_cookie_header_empty_key_whitespace_semicolon():
    assert True
`
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "Fix parse_mimetype producing spurious empty-key parameter for whitespace-only segments after semicolons",
        { changedFiles, routeLimit: 9, budget: 6000, maxDrawers: 4 }
      );

      expect(evaluation.route.files).toEqual(changedFiles);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBe(1);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("keeps direct utility and integration tests for one CommonJS implementation", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "lib/util/cache.js",
        "test/cache-interceptor/utils.js",
        "test/interceptors/cache.js"
      ];
      const files = new Map<string, string>([
        [
          changedFiles[0],
          `function parseCacheControlHeader(value) { return value.split(',') }
function makeCacheKey(value) { return value }
module.exports = { parseCacheControlHeader, makeCacheKey }
`
        ],
        [
          changedFiles[1],
          `const { parseCacheControlHeader } = require('../../lib/util/cache')
describe('parseCacheControlHeader', () => {
  test('handles empty qualified private cache directive', () => {
    parseCacheControlHeader('private=""')
  })
})
`
        ],
        [
          changedFiles[2],
          `const { makeCacheKey } = require('../../lib/util/cache')
describe('cache interceptor', () => {
  test('does not cache an empty qualified private response', () => {
    makeCacheKey('private')
  })
})
`
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "fix: handle empty qualified private cache directive",
        { changedFiles, routeLimit: 9, budget: 6000, maxDrawers: 4 }
      );

      expect([...evaluation.route.files].sort()).toEqual([...changedFiles].sort());
      expect(evaluation.route.files).toHaveLength(changedFiles.length);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBe(1);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("keeps an attribute-macro task inside one workspace crate and its causal siblings", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "telemetry-derive/src/attr.rs",
        "telemetry-derive/src/expand.rs",
        "telemetry-derive/src/lib.rs",
        "telemetry-derive/tests/fields.rs"
      ];
      const files = new Map<string, string>([
        [
          changedFiles[0],
          `use syn::{Expr, Ident};
pub struct InstrumentArgs { fields: Option<Fields> }
pub struct Fields(Vec<Field>);
pub struct Field { name: Vec<Ident>, value: Option<Expr> }
impl Field {
    pub fn parse_name(input: ParseStream) -> Field {
        Field { name: parse_dotted_ident(input), value: parse_expression(input) }
    }
}
`
        ],
        [
          changedFiles[1],
          `use crate::attr::{Field, Fields, InstrumentArgs};
pub fn gen_block(args: InstrumentArgs) {
    for Field { name, value } in args.fields {
        record_instrument_field(name, value);
    }
}
`
        ],
        [
          changedFiles[2],
          `mod attr;
mod expand;
pub fn instrument(input: TokenStream) {
    expand::gen_block(attr::parse_args(input));
}
`
        ],
        [
          changedFiles[3],
          `use telemetry_derive::instrument;
#[instrument(fields(answer = value))]
fn field_name_value(value: usize) {}
#[test]
fn instrument_records_field_names() { field_name_value(42); }
`
        ],
        [
          "telemetry/src/lib.rs",
          `//! Constant expressions can be used as field names.
//! Braces indicate that the value of a constant is the field name.
pub fn record_instrument_field_name(value: &str) -> &str { value }
`
        ],
        [
          "telemetry/tests/fields.rs",
          "#[test]\nfn constant_field_name() { assert!(true); }\n"
        ],
        [
          "telemetry-subscriber/src/fields.rs",
          "pub fn record_instrument_fields() {}\n"
        ]
      ]);
      files.set(
        "telemetry-subscriber/src/filter/mod.rs",
        `${Array.from({ length: 12 }, (_, index) => `mod field_${index};`).join("\n")}\n`
      );
      for (let index = 0; index < 12; index += 1) {
        const functionName = index === 0
          ? "parse_field_expression"
          : `filter_field_name_${index}`;
        files.set(
          `telemetry-subscriber/src/filter/field_${index}.rs`,
          `use crate::filter::field_${(index + 1) % 12};
pub fn ${functionName}() {}
`
        );
      }
      for (let index = 0; index < 5; index += 1) {
        files.set(
          `telemetry-subscriber/tests/field_filter_${index}.rs`,
          `use telemetry_subscriber::filter::field_${index};
#[test]
fn field_filter_event_${index}() { assert!(true); }
`
        );
      }
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "Support constant expressions as instrument field names",
        { changedFiles, routeLimit: 9, budget: 6000, maxDrawers: 4 }
      );

      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.75);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("expands a response-use bug through all causally related implementation siblings", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "src/core/handlers/ResultHandler.ts",
        "src/core/utils/ResultEnvelope/decorators.ts",
        "src/core/utils/request/storeResultCookies.ts",
        "test/browser/rest-api/request/request-cookies.mocks.ts"
      ];
      const files = new Map<string, string>([
        [
          changedFiles[0],
          `import type { ResultEnvelope } from '../ResultEnvelope';
export abstract class ResultHandler {
  public isUsed = false;
  public async run(resolver: () => Promise<ResultEnvelope | undefined>) {
    const mockedResponse = await resolver();
    if (mockedResponse) this.isUsed = true;
    return this.createExecutionResult({ response: mockedResponse });
  }
  protected abstract createExecutionResult(args: { response?: ResultEnvelope }): unknown;
}
`
        ],
        [
          changedFiles[1],
          `import type { ResultEnvelopeInit } from '../../ResultEnvelope';
export const kSetCookie = Symbol('kSetCookie');
export function decorateResult(response: Response, init: ResultEnvelopeInit) {
  const responseCookies = init.headers?.get('set-cookie');
  if (responseCookies) Reflect.set(response, kSetCookie, responseCookies);
  return response;
}
`
        ],
        [
          changedFiles[2],
          `import { kSetCookie } from '../ResultEnvelope/decorators';
import { cookieStore } from '../cookieStore';
export function storeResultCookies(response: Response) {
  return cookieStore.set(Reflect.get(response, kSetCookie));
}
`
        ],
        [
          changedFiles[3],
          `import { result, ResultEnvelope } from 'mock-service';
export const worker = result.post('/set-cookies', async ({ request }) => {
  return new ResultEnvelope(null, {
    headers: { 'Set-Cookie': await request.text() },
  });
});

`
        ],
        [
          "package.json",
          JSON.stringify({ name: "mock-service", source: "src/core/index.ts" })
        ],
        [
          "src/core/index.ts",
          "export { ResultEnvelope } from './ResultEnvelope';\n"
        ],
        [
          "src/core/ResultEnvelope.ts",
          `import { decorateResult } from './utils/ResultEnvelope/decorators';
export type ResultEnvelopeInit = { headers?: Headers };
export class ResultEnvelope extends Response {
  constructor(body?: BodyInit | null, init: ResultEnvelopeInit = {}) {
    super(body, init);
    decorateResult(this, init);
  }
}
`
        ],
        [
          "src/core/ResultEnvelope.test.ts",
          "test('ResultEnvelope serializes response cookies', () => true);\n"
        ],
        [
          "test/browser/response/result-cookies.test.ts",
          "test('response forwards all cookies', () => true);\n"
        ]
      ]);
      files.set(
        "src/core/http.ts",
        "export function createHttpResponse() { return new Response(); }\n"
      );
      files.set(
        "src/core/experimental/frames/http-frame.ts",
        `import { ResultEnvelope } from '../../ResultEnvelope';
export function resolveHttpFrame(response: ResultEnvelope) {
  return { response, cookies: response.headers.get('set-cookie'), used: true };
}
`
      );
      files.set(
        "src/core/handlers/HttpHandler.ts",
        `import type { ResultEnvelope } from '../ResultEnvelope';
import { getRequestCookies } from '../utils/request/getRequestCookies';
import { ResultHandler } from './ResultHandler';
export class HttpHandler extends ResultHandler {
  public handleHttpResponse(response: ResultEnvelope) {
    return [response, getRequestCookies(new Request('https://example.test'))];
  }
}
`
      );
      files.set(
        "src/core/utils/cookieStore.ts",
        "export const cookieStore = { get: () => ({}), set: (value: unknown) => value };\n"
      );
      files.set(
        "src/core/utils/request/getRequestCookies.ts",
        `import { cookieStore } from '../cookieStore';
export function getRequestCookies(request: Request) {
  return { request, cookies: cookieStore.get() };
}
`
      );
      files.set(
        "test/browser/rest-api/response/result-cookies.mocks.ts",
        `import { result, ResultEnvelope } from 'mock-service';
export const worker = result.get('/response-cookies', () => {
  return new ResultEnvelope(null, { headers: { 'Set-Cookie': 'direct=yes' } });
});
`
      );
      for (let index = 0; index < 36; index += 1) {
        files.set(
          `test/browser/response/response-cookies-${index}.test.ts`,
          `test('http response cookies are forwarded ${index}', () => true);\n`
        );
      }
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "fix(ResultEnvelope): forward cookies only when response is used",
        { changedFiles, routeLimit: 9, budget: 6000, maxDrawers: 4 }
      );

      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.fileCount).toBeLessThanOrEqual(8);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.5);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("excludes operational metadata while retaining a multi-file row-lifecycle fix", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "lifecycle/remove.go",
        "lifecycle/save.go",
        "result_api.go",
        "tests/result_test.go"
      ];
      const files = new Map<string, string>([
        [
          changedFiles[0],
          `package lifecycle
func Delete(rows Rows) {
    scanRows(rows)
    addError(rows.Close())
}
`
        ],
        [
          changedFiles[1],
          `package lifecycle
func Update(rows Rows) {
    if shouldResetAssignments() {
        defer delete(statementClauses, "SET")
    }
    mutateDestination()
    scanRows(rows)
    restoreDestination()
    addError(rows.Close())
}
`
        ],
        [
          changedFiles[2],
          `package data
func (db *DB) Scan(dest interface{}) {
    rows := db.Rows()
    if rows.Next() {
        db.ScanRows(rows, dest)
    }
    db.AddError(rows.Close())
}
`
        ],
        [
          changedFiles[3],
          `package tests
func TestSelectWithVariables(t *testing.T) {
    rows := DB.Table("users").Rows()
    if rows.Next() { inspectColumns(rows) }
    rows.Close()
}
`
        ],
        [
          ".github/workflows/panic-rows.yml",
          "name: close leaked rows after panic\non: issues\njobs:\n  classify:\n    name: defer rows Close query panic\n"
        ],
        [
          "lifecycle/create.go",
          "package lifecycle\nfunc Create(rows Rows) { defer rows.Close(); scanRows(rows) }\n"
        ],
        [
          "lifecycle/query.go",
          "package lifecycle\nfunc Query(rows Rows) { defer rows.Close(); scanRows(rows) }\n"
        ],
        [
          "migrator/migrator.go",
          "package migrator\nfunc ColumnTypes(rows Rows) { defer rows.Close(); inspectColumns(rows) }\n"
        ],
        [
          "tests/sql_builder_test.go",
          "package tests\nfunc TestGroupRows(t *testing.T) { rows := DB.Rows(); defer rows.Close() }\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "Fix potential rows leak on panic by deferring rows.Close()",
        { changedFiles, routeLimit: 9, budget: 6000, maxDrawers: 4 }
      );

      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.files).not.toContain(".github/workflows/panic-rows.yml");
      expect(evaluation.route.fileCount).toBeLessThanOrEqual(8);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.5);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("routes an explicit Rust type through its declaration, producers, and integration test", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = ["src/connect.rs", "src/tls.rs", "tests/client.rs"];
      const files = new Map<string, string>([
        [
          changedFiles[0],
          `use crate::tls::TlsInfo;
pub fn build_connection(stream: TlsStream) -> Option<TlsInfo> {
    let certificate = stream.peer_certificate();
    Some(TlsInfo { peer_certificate: certificate })
}
`
        ],
        [
          changedFiles[1],
          `use std::fmt;
fn configure_backend() {}
fn load_roots() {}
pub struct TlsInfo {
    pub(crate) peer_certificate: Option<Vec<u8>>,
}
impl TlsInfo {
    pub fn peer_certificate(&self) -> Option<&[u8]> {
        self.peer_certificate.as_deref()
    }
}
`
        ],
        [
          changedFiles[2],
          `#[tokio::test]
async fn test_tls_info() {
    let response = build_client().send().await;
    let tls_info = response.extensions().get::<reqwest::tls::TlsInfo>();
    assert!(tls_info.is_some());
}
`
        ],
        [
          "src/async_impl/client.rs",
          "pub fn negotiated_tls_version_for_connection() -> Option<String> { None }\n"
        ],
        [
          "tests/tls_backend.rs",
          "#[test]\nfn negotiated_version_uses_backend_defaults() { assert!(true); }\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "feat: expose the negotiated TLS version via `TlsInfo`",
        { changedFiles, routeLimit: 9, budget: 6000, maxDrawers: 4 }
      );

      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.fileCount).toBeLessThanOrEqual(4);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.75);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("stops after an exact function implementation and its focused test", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = ["protocol/helpers.py", "tests/test_helpers.py"];
      const files = new Map<string, string>([
        [
          changedFiles[0],
          "def parse_content_type(value):\n    return {part.strip(): True for part in value.split(';') if part.strip()}\n"
        ],
        [
          changedFiles[1],
          "from protocol.helpers import parse_content_type\ndef test_parse_content_type_ignores_whitespace_only_parameters():\n    assert parse_content_type('text/plain;   ') == {}\n"
        ],
        [
          "protocol/client_request.py",
          "from protocol.helpers import parse_content_type\ndef parse_content_type_for_request(value):\n    return parse_content_type(value)\n"
        ],
        [
          "protocol/http_parser.py",
          "from protocol.helpers import parse_content_type\ndef parse_content_type_header(value):\n    return parse_content_type(value)\n"
        ],
        [
          "tests/test_cookie_helpers.py",
          `from protocol.helpers import parse_content_type
def test_parse_cookie_header_empty_key_in_fallback():
    """Whitespace-only segments after semicolons must not produce an empty key."""
    assert parse_content_type('text/plain; ; cookie=value')
`
        ],
        [
          "tests/test_client_auth.py",
          "from protocol.client_request import parse_content_type_for_request\ndef test_client_content_type_auth_parameters():\n    assert parse_content_type_for_request('text/plain; auth=value')\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "Fix parse_content_type producing an empty parameter for whitespace-only segments after semicolons",
        { changedFiles, routeLimit: 9, budget: 6000, maxDrawers: 4 }
      );

      expect(evaluation.route.files).toEqual(changedFiles);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBe(1);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("caps confidence when identical implementation pairs leave workspace ownership unresolved", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        [
          "alpha-runtime/src/fields.rs",
          "pub fn normalize_constant_field(value: &str) -> &str { value }\n"
        ],
        [
          "alpha-runtime/tests/fields.rs",
          "#[test]\nfn constant_field_is_normalized() { assert!(true); }\n"
        ],
        [
          "beta-runtime/src/fields.rs",
          "pub fn normalize_constant_field(value: &str) -> &str { value }\n"
        ],
        [
          "beta-runtime/tests/fields.rs",
          "#[test]\nfn constant_field_is_normalized() { assert!(true); }\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const route = await routePalace(
        root,
        "Fix constant field normalization",
        { routeLimit: 9, budget: 6000 }
      );

      expect(route.confidence).toBeLessThanOrEqual(0.15);
    });
  });

  it("reserves route budget for an explicitly requested locale before generic formatting modules", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "src/calendar/locales/ja/custom.py",
        "tests/formatting/test_formatter.py"
      ];
      const files = new Map<string, string>([
        [
          changedFiles[0],
          "DATE_FORMATS = {'L': 'YYYY/MM/DD'}\ndef japanese_date_formats():\n    return DATE_FORMATS\n"
        ],
        [
          changedFiles[1],
          "from calendar.formatting.formatter import format_date\ndef test_japanese_date_formats_for_ja_locale():\n    assert format_date('ja') == 'YYYY/MM/DD'\n"
        ],
        [
          "src/calendar/date.py",
          "def format_date_for_locale(locale):\n    return locale\n"
        ],
        [
          "src/calendar/datetime.py",
          "def datetime_date_format(locale):\n    return locale\n"
        ],
        [
          "src/calendar/formatting/formatter.py",
          "def format_date(locale):\n    return 'date format for locale'\n"
        ],
        [
          "src/calendar/formatting/difference_formatter.py",
          "def format_date_difference(locale):\n    return 'date formats'\n"
        ],
        [
          "tests/date/test_strings.py",
          "def test_date_format_strings_for_locale():\n    assert True\n"
        ],
        [
          "tests/datetime/test_from_format.py",
          "def test_datetime_from_date_format():\n    assert True\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "fix(locale): use Japanese date formats for the ja locale",
        { changedFiles, routeLimit: 8, budget: 6000, maxDrawers: 4 }
      );

      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.5);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("keeps a compound task inside the package anchored by its named implementation", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "distribution/src/lib.rs",
        "distribution/src/pert.rs",
        "distribution/tests/value_stability.rs"
      ];
      const files = new Map<string, string>([
        [
          changedFiles[0],
          "pub mod pert;\npub use pert::{Pert, PertBuilder};\n"
        ],
        [
          changedFiles[1],
          "pub struct Pert;\npub struct PertBuilder;\nimpl PertBuilder { pub fn mode_approximately_equal_to_mean(self) -> Pert { Pert } }\n"
        ],
        [
          changedFiles[2],
          "use distribution::{Pert, PertBuilder};\n#[test]\nfn pert_mode_approximately_equal_to_mean_is_stable() { let _ = PertBuilder; }\n"
        ],
        [
          "distribution/src/geometric.rs",
          "pub struct Geometric;\nimpl Geometric { pub fn mean_and_mode(&self) {} }\n"
        ],
        [
          "distribution/src/hypergeometric.rs",
          "pub struct Hypergeometric;\nimpl Hypergeometric { pub fn builder_mode_mean(&self) {} }\n"
        ],
        [
          "src/rng.rs",
          "pub trait Rng { fn mode_mean_builder(&self); }\n"
        ],
        [
          "src/rngs/thread.rs",
          "pub fn thread_rng_builder_mode_mean() {}\n"
        ],
        [
          "src/rngs/reseeding.rs",
          "pub fn reseeding_rng_builder_mode_mean() {}\n"
        ],
        [
          "tests/rng_test.rs",
          "#[test]\nfn rng_builder_mode_mean() { assert!(true); }\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "Fix Pert for mode approximately equal to mean; use builder pattern",
        { changedFiles, routeLimit: 10, budget: 6000, maxDrawers: 4 }
      );

      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.files.every((sourcePath) => sourcePath.startsWith("distribution/"))).toBe(true);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.6);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("stops at an exact implementation-test pair despite dense generic neighbors", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = ["watch.go", "watch_test.go"];
      const files = new Map<string, string>([
        [
          changedFiles[0],
          "package watch\nfunc Add(path string) {}\nfunc Remove(path string) {}\n"
        ],
        [
          changedFiles[1],
          "package watch\nfunc TestAddRemoveWithoutReadingEvents(t *testing.T) {}\n"
        ],
        ["backend_linux.go", "package watch\nfunc AddRemoveEventsWithoutReadingLinux() {}\n"],
        ["backend_windows.go", "package watch\nfunc AddRemoveEventsWithoutReadingWindows() {}\n"],
        ["backend_bsd.go", "package watch\nfunc AddRemoveEventsWithoutReadingBSD() {}\n"],
        ["helpers_test.go", "package watch\nfunc addRemoveWithoutReadingHelper() {}\n"],
        ["testdata/watch-dir/only-remove", "add remove without reading events\n"]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "Add test to ensure Add()/Remove() works when not reading events",
        { changedFiles, routeLimit: 10, budget: 6000, maxDrawers: 4 }
      );

      expect(evaluation.route.files).toEqual(changedFiles);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBe(1);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("stops at a task-named module mirror before related collection helpers", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = ["source/internal/_equals.js", "test/equals.js"];
      const files = new Map<string, string>([
        [
          changedFiles[0],
          "export function equals(a, b) { return compareSetAndMapMembersAsMultiset(a, b); }\nfunction compareSetAndMapMembersAsMultiset(a, b) { return true; }\n"
        ],
        [
          changedFiles[1],
          "import equals from '../source/internal/_equals.js';\ndescribe('equals', () => it('compares Set and Map members as a multiset', () => equals(new Set(), new Set())));\n"
        ],
        [
          "source/internal/_Set.js",
          "export function SetMemberMap(values) { return new Set(values); }\n"
        ],
        [
          "source/empty.js",
          "export function empty(value) { return value instanceof Set || value instanceof Map; }\n"
        ],
        [
          "test/empty.js",
          "import empty from '../source/empty.js';\ndescribe('empty', () => it('handles Set and Map members', () => empty(new Set())));\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "fix: compare Set and Map members as a multiset in equals",
        { changedFiles, routeLimit: 10, budget: 6000, maxDrawers: 4 }
      );

      expect(evaluation.route.files).toEqual(changedFiles);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBe(1);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("bounds an additive external trait feature to its target type, package manifest, and main tests", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = ["src/lib.rs", "Cargo.toml", "src/tests.rs"];
      const files = new Map<string, string>([
        [
          "Cargo.toml",
          "[package]\nname = \"smallvec\"\nversion = \"1.0.0\"\n\n[dependencies]\nserde = \"1\"\n"
        ],
        [
          "src/lib.rs",
          "pub struct SmallVec<T> { values: Vec<T> }\nimpl<T> SmallVec<T> { pub fn push(&mut self, value: T) { self.values.push(value); } }\n"
        ],
        [
          "src/tests.rs",
          "use crate::SmallVec;\n#[test]\nfn small_vec_mutation() { let mut values = SmallVec { values: vec![] }; values.push(1); }\n"
        ],
        [
          "fuzz/fuzz_targets/smallvec_ops.rs",
          "use smallvec::SmallVec;\nfn fuzz_bytes(values: &mut SmallVec<u8>) { values.push(1); }\n"
        ],
        [
          "benches/bench.rs",
          "use smallvec::SmallVec;\nfn bench_mutation(values: &mut SmallVec<u8>) { values.push(1); }\n"
        ],
        [
          "tests/macro.rs",
          "use smallvec::SmallVec;\n#[test]\nfn smallvec_macro_mutation() { let _ = SmallVec::<u8> { values: vec![] }; }\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "feat: impl `bytes::BufMut` for `SmallVec` (v2)",
        { changedFiles, routeLimit: 10, budget: 6000, maxDrawers: 4 }
      );

      expect(evaluation.route.files).toEqual(changedFiles);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBe(1);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("anchors generated-code tasks to the owning workspace package and root integration test", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = ["codegen/src/snapshot.rs", "tests/debug/gen.rs"];
      const files = new Map<string, string>([
        [
          "Cargo.toml",
          "[workspace]\nmembers = [\"codegen\"]\n\n[package]\nname = \"syntax\"\nversion = \"1.0.0\"\n"
        ],
        [
          "codegen/Cargo.toml",
          "[package]\nname = \"codegen\"\nversion = \"1.0.0\"\n"
        ],
        [
          changedFiles[0],
          `const TESTS_DEBUG_SRC: &str = "tests/debug/gen.rs";
pub fn generate(definitions: &Definitions) -> Result<()> {
    file::write(TESTS_DEBUG_SRC, quote! { #definitions })?;
    Ok(())
}
`
        ],
        [
          changedFiles[1],
          "pub struct GeneratedNode;\nimpl core::fmt::Debug for GeneratedNode { fn fmt(&self, _: &mut core::fmt::Formatter) -> core::fmt::Result { Ok(()) } }\n"
        ],
        [
          "codegen/src/main.rs",
          "mod snapshot;\nfn main() { let definitions = load_definitions(); snapshot::generate(&definitions).unwrap(); }\n"
        ],
        ["src/generics.rs", "pub fn formatting_generics() {}\n"],
        ["src/parse.rs", "pub fn parse_generated_formatting() {}\n"],
        ["tests/test_derive_input.rs", "#[test]\nfn formatting_derive_input() {}\n"]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "Resolve useless borrows in formatting lint in generated code",
        { changedFiles, routeLimit: 8, budget: 6000, maxDrawers: 4 }
      );

      expect(evaluation.route.files).toEqual(changedFiles);
      expect(evaluation.route.files).not.toContain("src/generics.rs");
      expect(evaluation.route.files).not.toContain("src/parse.rs");
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBe(1);
    });
  });

  it("follows a bounded transitive dependency to a second focused regression test", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = ["src/v1.ts", "src/test/v1.test.ts", "src/test/v6.test.ts"];
      const files = new Map<string, string>([
        [
          changedFiles[0],
          "export function v1Bytes(node?: Uint8Array) { return node ?? new Uint8Array(6); }\n"
        ],
        [
          "src/v6.ts",
          "import { v1Bytes } from './v1';\nexport function v6Bytes() { return v1Bytes(); }\n"
        ],
        [
          changedFiles[1],
          "import { v1Bytes } from '../v1';\ndescribe('v1Bytes', () => it('returns six node bytes', () => v1Bytes()));\n"
        ],
        [
          changedFiles[2],
          "import { v6Bytes } from '../v6';\ndescribe('v6Bytes', () => it('returns version six bytes', () => v6Bytes()));\n"
        ],
        [
          "src/v4.ts",
          "export function v4Bytes() { return new Uint8Array(16); }\n"
        ],
        [
          "src/test/v4.test.ts",
          "import { v4Bytes } from '../v4';\ndescribe('v4Bytes', () => it('returns version four bytes', () => v4Bytes()));\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "fix(v1): set the multicast bit on v1Bytes's own randomly-generated node",
        { changedFiles, routeLimit: 8, budget: 6000, maxDrawers: 4 }
      );

      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.files).not.toContain("src/test/v4.test.ts");
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.6);
    });
  });

  it("recovers a causal implementation sibling jointly exercised by the focused test", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "src/secure/serializer.py",
        "src/secure/timed.py",
        "tests/test_serializer.py"
      ];
      const files = new Map<string, string>([
        [
          changedFiles[0],
          "class Serializer:\n    def default_fallback_digest(self):\n        return 'sha512'\n"
        ],
        [
          changedFiles[1],
          "from .serializer import Serializer\nclass TimedSerializer(Serializer):\n    pass\n"
        ],
        [
          changedFiles[2],
          "from secure.serializer import Serializer\nfrom secure.timed import TimedSerializer\ndef test_sha512_fallback_by_default():\n    assert Serializer().default_fallback_digest() == TimedSerializer().default_fallback_digest()\n"
        ],
        [
          "src/secure/signer.py",
          "class Signer:\n    def sha512_fallback_digest(self):\n        return 'legacy'\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "Add SHA-512 fallback by default",
        { changedFiles, routeLimit: 8, budget: 6000, maxDrawers: 4 }
      );

      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.6);
    });
  });

  it("does not add verification configuration when a feature task does not request it", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = ["src/formatting.py", "tests/test_formatting.py", "CHANGES.rst"];
      const files = new Map<string, string>([
        [
          changedFiles[0],
          "class Formatter:\n    def format_map(self, values):\n        return values\n"
        ],
        [
          changedFiles[1],
          "from formatting import Formatter\ndef test_format_map():\n    assert Formatter().format_map({}) == {}\n"
        ],
        [changedFiles[2], "Changes\n=======\n\nUnreleased\n----------\n"],
        ["tox.ini", "[tox]\nenvlist = py311\n[testenv]\ncommands = pytest\n"],
        ["README.rst", "Formatting library documentation.\n"]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "implement format_map",
        { changedFiles, routeLimit: 8, budget: 6000, maxDrawers: 4 }
      );

      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.files).not.toContain("tox.ini");
      expect(evaluation.route.files).not.toContain("README.rst");
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBe(1);
    });
  });

  it("adds bounded changelog and explicitly requested verification configuration roles for a feature route", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = ["src/formatting.py", "tests/test_formatting.py", "CHANGES.rst", "tox.ini"];
      const files = new Map<string, string>([
        [
          changedFiles[0],
          "class Formatter:\n    def format_map(self, values):\n        return values\n"
        ],
        [
          changedFiles[1],
          "from formatting import Formatter\ndef test_format_map():\n    assert Formatter().format_map({}) == {}\n"
        ],
        [changedFiles[2], "Changes\n=======\n\nUnreleased\n----------\n"],
        [changedFiles[3], "[tox]\nenvlist = py311\n[testenv]\ncommands = pytest\n"],
        ["README.rst", "Formatting library documentation.\n"]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "feat: implement format_map; include tox.ini",
        { changedFiles, routeLimit: 8, budget: 6000, maxDrawers: 4 }
      );

      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.files).not.toContain("README.rst");
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.67);
    });
  });

  it("prunes single generic lexical hits and unrelated metadata after stronger implementation evidence", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        [
          "src/fixed_buffer.rs",
          "pub struct FixedBuffer;\nimpl FixedBuffer { pub const fn new_const() -> Self { Self } pub fn new() -> Self { Self } }\n"
        ],
        [
          "src/text_buffer.rs",
          "pub struct TextBuffer;\nimpl TextBuffer { pub const fn new_const() -> Self { Self } pub fn new() -> Self { Self } }\n"
        ],
        [
          "src/buffer_impl.rs",
          "pub trait BufferImpl { fn new() -> Self; fn new_const() -> Self; }\n"
        ],
        [
          "src/char_codec.rs",
          "pub fn add_character(value: char) -> char { value }\n"
        ],
        [
          "src/errors.rs",
          "pub fn new_error() -> &'static str { \"new error\" }\n"
        ],
        [
          "src/helpers.rs",
          "pub const fn const_storage() -> usize { 1 }\n"
        ],
        [
          "tests/construction.rs",
          "use crate::{FixedBuffer, TextBuffer};\n#[test]\nfn const_construction() { let _ = (FixedBuffer::new_const(), TextBuffer::new_const()); }\n"
        ],
        [
          "Cargo.toml",
          "[package]\nname = \"fixed-buffer\"\nversion = \"0.1.0\"\n"
        ],
        [
          "LICENSE-APACHE",
          "Apache License Version 2.0\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const route = await routePalace(
        root,
        "FIX: Add new_const() for const construction and revert new to the old version",
        { routeLimit: 10, budget: 6000 }
      );
      const filesOnly = route.route.map((step) => step.sourcePath.replace(/:\d+(?:-\d+)?$/, ""));

      expect(filesOnly).toEqual(expect.arrayContaining([
        "src/fixed_buffer.rs",
        "src/text_buffer.rs",
        "tests/construction.rs"
      ]));
      expect(filesOnly).not.toContain("src/char_codec.rs");
      expect(filesOnly).not.toContain("src/errors.rs");
      expect(filesOnly).not.toContain("Cargo.toml");
      expect(filesOnly).not.toContain("LICENSE-APACHE");
    });
  });

  it("stops after a task-aligned symbol pair when package neighbors add no new evidence", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = ["connection.go", "connection_test.go"];
      const files = new Map<string, string>([
        [
          changedFiles[0],
          "package socket\ntype MessageType int\nfunc (kind MessageType) String() string { return \"message\" }\n"
        ],
        [
          changedFiles[1],
          "package socket\nfunc TestMessageTypeString(t *testing.T) { var kind MessageType; _ = kind.String() }\n"
        ],
        ["prepared.go", "package socket\nfunc prepareMessageType(kind MessageType) string { return kind.String() }\n"],
        ["server.go", "package socket\nfunc serveMessageType(kind MessageType) string { return kind.String() }\n"],
        ["examples/chat/client.go", "package chat\nfunc displayMessageType() string { return \"message type\" }\n"]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "feat: format message type",
        { changedFiles, routeLimit: 8, budget: 6000, maxDrawers: 4 }
      );

      expect(evaluation.route.files).toEqual(changedFiles);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBe(1);
    });
  });

  it("stops a specific parsing-error route before shared-entity consumers and fuzz targets", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = ["src/error.rs", "src/parse.rs", "tests/test_version.rs"];
      const files = new Map<string, string>([
        [
          "src/lib.rs",
          "mod display; mod error; mod identifier; mod impls; mod parse; pub struct Version { pub major: u64 }\n"
        ],
        [
          changedFiles[0],
          `use crate::parse::Error;
pub enum ErrorKind { EmptySegment, UnexpectedEnd }
impl core::fmt::Display for Error {
    fn fmt(&self, formatter: &mut core::fmt::Formatter) -> core::fmt::Result {
        formatter.write_str("unexpected end while parsing version")
    }
}
`
        ],
        [
          changedFiles[1],
          "use crate::error::ErrorKind; use crate::Version; pub struct Error { pub kind: ErrorKind } impl Version { pub fn parse(text: &str) -> Result<Self, Error> { if text.is_empty() { return Err(Error { kind: ErrorKind::UnexpectedEnd }); } Ok(Version { major: 1 }) } }\n"
        ],
        [
          "src/identifier.rs",
          "pub struct Identifier(String); impl Identifier { pub fn is_empty(&self) -> bool { self.0.is_empty() } } // crate version compatibility\n"
        ],
        [
          "src/display.rs",
          "use crate::Version; impl core::fmt::Display for Version { fn fmt(&self, f: &mut core::fmt::Formatter) -> core::fmt::Result { write!(f, \"{}\", self.major) } }\n"
        ],
        [
          "src/impls.rs",
          "use crate::Version; impl Default for Version { fn default() -> Self { Version { major: 0 } } }\n"
        ],
        [
          changedFiles[2],
          "use semver::Version; #[test] fn parse_empty_version_reports_dedicated_error() { assert!(Version::parse(\"\").is_err()); }\n"
        ],
        [
          "tests/test_version_req.rs",
          "use semver::VersionReq; #[test] fn parse_empty_version_requirement() { assert!(\"\".parse::<VersionReq>().is_err()); }\n"
        ],
        [
          "fuzz/parse_version_req.rs",
          "use semver::VersionReq; fn fuzz_parse_version_req(text: &str) { let _ = text.parse::<VersionReq>(); }\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "Add a dedicated error for parsing Version from empty string",
        { changedFiles, routeLimit: 8, budget: 6000, maxDrawers: 4 }
      );

      expect([...evaluation.route.files].sort()).toEqual([...changedFiles].sort());
      expect(evaluation.route.fileCount).toBe(3);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.75);
    });
  });

  it("returns a low-confidence implementation and test fallback for a novel feature with no lexical anchor", async () => {
    await withFixture("minimal-package", async (root) => {
      const files = new Map<string, string>([
        ["index.js", "export default function isUnicodeSupported() { return process.platform !== 'win32'; }\n"],
        ["index.d.ts", "export default function isUnicodeSupported(): boolean;\n"],
        ["test.js", "import test from 'ava'; test('unicode', t => t.true(true));\n"],
        ["index.test-d.ts", "import isUnicodeSupported from './index.js'; isUnicodeSupported();\n"]
      ]);
      for (const [relativePath, source] of files) {
        await writeFile(path.join(root, relativePath), source, "utf8");
      }
      await indexPalace(root);

      const route = await routePalace(root, "Add support for Terminus (#12)", {
        routeLimit: 10,
        budget: 6000
      });
      const routed = route.route.map((step) => step.sourcePath.replace(/:\d+(?:-\d+)?$/, ""));

      expect(routed.slice(0, 2)).toEqual(["index.js", "test.js"]);
      expect(routed).not.toContain("index.test-d.ts");
      expect(route.confidence).toBeLessThanOrEqual(0.15);
    });
  });

  it("closes an additive root option through its declaration, test, and public documentation", async () => {
    await withFixture("minimal-package", async (root) => {
      const changedFiles = ["index.js", "index.d.ts", "test.js", "readme.md"];
      const files = new Map<string, string>([
        [changedFiles[0], "export default function mimicFn(to, from) { return Object.assign(to, from); }\n"],
        [changedFiles[1], "export default function mimicFn(to: Function, from: Function): Function;\n"],
        [changedFiles[2], "import test from 'ava'; test('mimic', t => t.true(true));\n"],
        [changedFiles[3], "# mimic-fn\n\nCopy one function onto another.\n"]
      ]);
      for (const [relativePath, source] of files) {
        await writeFile(path.join(root, relativePath), source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "Add `ignoreNonConfigurable` option (#34)",
        { changedFiles, routeLimit: 8, budget: 6000, maxDrawers: 4 }
      );

      expect([...evaluation.route.files].sort()).toEqual([...changedFiles].sort());
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBe(1);
    });
  });

  it("expands string-annotation semantics to the owning Python typing plugin and focused test", async () => {
    await withFixture("minimal-package", async (root) => {
      const changedFiles = [
        "pyupgrade/_plugins/typing_pep563.py",
        "tests/features/typing_pep563_test.py"
      ];
      const files = new Map<string, string>([
        [changedFiles[0], "def unstring_annotation(tokens):\n    return tokens\n"],
        [changedFiles[1], "def test_multiline_annotation():\n    assert True\n"],
        ["pyupgrade/_string_helpers.py", "def parse_string_literal(value):\n    return value\n"],
        ["tests/string_helpers_test.py", "def test_string_literal():\n    assert True\n"]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "fix unstringing multiline string annotations",
        { changedFiles, routeLimit: 8, budget: 6000, maxDrawers: 4 }
      );

      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.files).not.toContain("tests/string_helpers_test.py");
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.5);
    });
  });

  it("expands fail-fast behavior to first-error and cancellation implementations with sibling tests", async () => {
    await withFixture("minimal-package", async (root) => {
      const changedFiles = [
        "pool/context_pool.go",
        "pool/context_pool_test.go",
        "pool/result_context_pool.go",
        "pool/result_context_pool_test.go"
      ];
      const files = new Map<string, string>([
        [changedFiles[0], "package pool\ntype ContextPool struct{}\nfunc (p *ContextPool) WithFirstError() *ContextPool { return p }\nfunc (p *ContextPool) WithCancelOnError() *ContextPool { return p }\n"],
        [changedFiles[1], "package pool\nfunc ExampleContextPool_WithCancelOnError() {}\nfunc TestContextPool(t *testing.T) { t.Run(\"WithFirstError\", func(t *testing.T) {}) }\n"],
        [changedFiles[2], "package pool\ntype ResultContextPool struct{ contextPool *ContextPool }\nfunc (p *ResultContextPool) WithFirstError() *ResultContextPool { p.contextPool.WithFirstError(); return p }\nfunc (p *ResultContextPool) WithCancelOnError() *ResultContextPool { p.contextPool.WithCancelOnError(); return p }\n"],
        [changedFiles[3], "package pool\nfunc TestResultContextPool(t *testing.T) { t.Run(\"WithFirstError\", func(t *testing.T) {}); t.Run(\"WithCancelOnError\", func(t *testing.T) {}) }\n"],
        ["waitgroup.go", "package conc\n// Add starts another worker.\nfunc (w *WaitGroup) Add() {}\n"],
        ["waitgroup_test.go", "package conc\nfunc TestWaitGroupAdd(t *testing.T) {}\n"]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "Add `WithFailFast()` (#118)",
        { changedFiles, routeLimit: 10, budget: 6000, maxDrawers: 4 }
      );

      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.files).not.toContain("waitgroup.go");
      expect(evaluation.route.files).not.toContain("waitgroup_test.go");
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.67);
    });
  });

  it("expands Apple platform-family tasks to the central implementation and both verification surfaces", async () => {
    await withFixture("minimal-package", async (root) => {
      const changedFiles = [
        "src/symbolize/gimli.rs",
        "crates/macos_frames_test/tests/main.rs",
        "tests/accuracy/main.rs"
      ];
      const files = new Map<string, string>([
        [changedFiles[0], "#[cfg(any(target_os = \"macos\", target_os = \"ios\", target_os = \"tvos\", target_os = \"watchos\"))]\npub fn apple_symbols() {}\n"],
        [changedFiles[1], "#[cfg(target_os = \"macos\")]\nfn apple_frames_are_available() {}\n"],
        [changedFiles[2], "fn accuracy() { if cfg!(target_os = \"macos\") { assert!(true); } }\n"],
        ["src/backtrace/libunwind.rs", "pub fn unwind_stack() { if cfg!(target_vendor = \"apple\") {} }\n"]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "Add Apple visionOS support",
        { changedFiles, routeLimit: 8, budget: 6000, maxDrawers: 4 }
      );

      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.files).not.toContain("src/backtrace/libunwind.rs");
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.6);
    });
  });
});
