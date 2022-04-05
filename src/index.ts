import { WASI } from "@wasmer/wasi";
import { WasmFs } from "@wasmer/wasmfs";
import { DefaultRubyVM, DefaultWASI } from "./browser";
import { RubyVM } from "ruby-head-wasm-wasi/dist/index";

let wasi:WASI;
let wasmFs:WasmFs;

let outputBuffer:string[] = [];
const inputTextArea:HTMLTextAreaElement = <HTMLTextAreaElement>document.getElementById("input");
const outputTextArea:HTMLTextAreaElement = <HTMLTextAreaElement>document.getElementById("output");

const printToOutput = function (line: string) {
  outputBuffer.push(line);
  outputTextArea.value = outputBuffer.join("");
}

const main = async () => {
  const defaultWASI = DefaultWASI({ 
    consolePrint: true, 
    consoleHandlers: {1: printToOutput, 2: printToOutput }
  });
  wasi = defaultWASI.wasi;
  wasmFs = defaultWASI.wasmFs;

  document.getElementById("input").onkeydown = checkRunWithKeyboard;
  document.getElementById("run").onclick = runRubyScriptsInHtml;
  document.getElementById("clear").onclick = selectAllScripts;
  // document.getElementById("files").onclick = listFiles;

  runRubyScriptsInHtml();
};

const checkRunWithKeyboard = function(event: KeyboardEvent) {
  if (event.ctrlKey && event.key == "Enter") {
    runRubyScriptsInHtml();
  } 
}

export const runRubyScriptsInHtml = function () {
  const instantiateVM = async () => {
    const { vm } = await DefaultRubyVM(wasi, wasmFs);
    return vm;
  }

  instantiateVM()
  .then((vm) => {
    outputBuffer = [];

    try {
      const result = vm.eval(inputTextArea.value);
    
      if (outputBuffer.length == 0) {
        outputTextArea.value = result.toString();
      }  
    } catch (error) {
      outputTextArea.value = error;
    }
  
    listFiles(vm);  
  })
};

export const selectAllScripts = function () {
  inputTextArea.focus();
  inputTextArea.select();
};

const listFiles = function (vm:RubyVM) {
  const files = <HTMLTextAreaElement>document.getElementById("files");

  const script = `def filetree(path)
  str = "#{path}\n"
  Dir.entries(".").each do |file|
    if File.directory?(file)
      str += "├─ #{file}/\n"
    else
      str += "├─ #{file}\n"
    end     
  end
  str
end

filetree("/")
  `; 

  files.value = vm.eval(script).toString();
};

main();
