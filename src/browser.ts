import { WASI } from "@wasmer/wasi";
import { WasmFs } from "@wasmer/wasmfs";
import * as path from "path-browserify"
import { RubyVM } from "ruby-head-wasm-wasi/dist/index";

export const DefaultRubyVM = async (
  rubyModule: WebAssembly.Module,
  options: { consolePrint: boolean, consoleHandlers: any } = { consolePrint: true, consoleHandlers: null }
) => {
  const wasmFs = new WasmFs();
  wasmFs.fs.mkdirSync("/tmp", 0o777);
  const wasi = new WASI({
    bindings: {
      ...WASI.defaultBindings,
      fs: wasmFs.fs,
      path: path,
    },
    preopens: {
        "/": "/tmp"
    }
  });

  if (options.consolePrint) {
    const originalWriteSync = wasmFs.fs.writeSync.bind(wasmFs.fs);
    wasmFs.fs.writeSync = function () {
      let fd: number = arguments[0];
      let text: string;
      if (arguments.length === 4) {
        text = arguments[1];
      } else {
        let buffer = arguments[1];
        text = new TextDecoder("utf-8").decode(buffer);
      }

      const handlers = options.consoleHandlers ?
        options.consoleHandlers :
        {
          1: (line: string) => console.log(line),
          2: (line: string) => console.warn(line),
        };

      if (handlers[fd]) {
        handlers[fd](text);
      }
      return originalWriteSync(...arguments);
    };
  }

  const vm = new RubyVM();
  const imports = {
    wasi_snapshot_preview1: wasi.wasiImport,
  };

  vm.addToImports(imports);

  const instance = await WebAssembly.instantiate(rubyModule, imports);

  await vm.setInstance(instance);

  wasi.setMemory(instance.exports.memory as WebAssembly.Memory);
  // Manually call `_initialize`, which is a part of reactor model ABI,
  // because the WASI polyfill doesn't support it yet.
  (instance.exports._initialize as Function)();
  vm.initialize();

  return {
    vm,
    wasi,
    fs: wasmFs,
    instance,
  };
};
