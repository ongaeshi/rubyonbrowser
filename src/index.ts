import { DefaultRubyVM } from "./browser";

let rubyVm:any = null;

let outputBuffer:string[] = [];
const inputTextArea:HTMLTextAreaElement = <HTMLTextAreaElement>document.getElementById("input");
const outputTextArea:HTMLTextAreaElement = <HTMLTextAreaElement>document.getElementById("output");

const printToOutput = function (line: string) {
  outputBuffer.push(line);
  outputTextArea.value = outputBuffer.join("");
}

const main = async () => {
  // Fetch and instntiate WebAssembly binary
  const response = await fetch(
    "https://cdn.jsdelivr.net/npm/ruby-head-wasm-wasi@0.2.0/dist/ruby.wasm"
  );
  const buffer = await response.arrayBuffer();
  const module = await WebAssembly.compile(buffer);
  const { vm } = await DefaultRubyVM(module, { 
    consolePrint: true, 
    consoleHandlers: {1: printToOutput, 2: printToOutput }
  });
  rubyVm = vm;

  document.getElementById("run").onclick = runRubyScriptsInHtml;
  document.getElementById("clear").onclick = selectAllScripts;
  document.getElementById("files").onclick = listFiles;

  runRubyScriptsInHtml();
};

export const runRubyScriptsInHtml = function () {
  outputBuffer = [];

  try {
    const result = rubyVm.eval(inputTextArea.value);
  
    if (outputBuffer.length == 0) {
      outputTextArea.value = result;
    }  
  } catch (error) {
    outputTextArea.value = error;
  }

  listFiles();
};

export const selectAllScripts = function () {
  inputTextArea.focus();
  inputTextArea.select();
};

const listFiles = function () {
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

  files.value = rubyVm.eval(script);
};

main();
