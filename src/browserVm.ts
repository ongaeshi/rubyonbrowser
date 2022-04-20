import { DefaultRubyVM } from "./browser";
import { RubyVM } from "ruby-head-wasm-wasi/dist/index"

export class BrowserVm {
  module: WebAssembly.Module
  vm: RubyVM

  async createVm(printToOutput:(line:string)=>void) {
    const response = await fetch(
      "https://cdn.jsdelivr.net/npm/ruby-head-wasm-wasi@0.3.0-2022-04-20-a/dist/ruby+stdlib.wasm"
    );
    const buffer = await response.arrayBuffer();
    this.module = await WebAssembly.compile(buffer);
    const { vm } = await DefaultRubyVM(this.module, { 
      consolePrint: true, 
      consoleHandlers: {1: printToOutput, 2: printToOutput }
    });
    this.vm = vm;  
  }
}
