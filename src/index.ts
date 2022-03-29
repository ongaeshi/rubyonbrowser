import { DefaultRubyVM } from "./browser";

let rubyVm:any = null;
const main = async () => {
  // Fetch and instntiate WebAssembly binary
  const response = await fetch(
    "https://cdn.jsdelivr.net/npm/ruby-head-wasm-wasi@0.2.0/dist/ruby.wasm"
  );
  const buffer = await response.arrayBuffer();
  const module = await WebAssembly.compile(buffer);
  const { vm } = await DefaultRubyVM(module);
  rubyVm = vm;

  rubyVm.printVersion();

  runRubyScriptsInHtml();
  document.getElementById("run").onclick = runRubyScriptsInHtml;
};

export const runRubyScriptsInHtml = function () {
  const input = <HTMLTextAreaElement>document.getElementById("input");
  const output = <HTMLTextAreaElement>document.getElementById("output");
  const result = rubyVm.eval(input.value);
  output.value = result;
};

main();
