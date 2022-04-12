import { BrowserVm } from "./browserVm";
import CodeMirror from "codemirror";
import "codemirror/mode/ruby/ruby";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/monokai.css";
import "./style.css";

let browserVm:BrowserVm;

let outputBuffer:string[] = [];
const codeEditor = CodeMirror.fromTextArea(document.getElementById("input") as HTMLTextAreaElement, {
  theme: 'monokai', // TODO: See other themes
  mode: "text/x-ruby",
  // matchBrackets: true, // TODO: Support TypeScript
  indentUnit: 2
});
const outputTextArea:HTMLTextAreaElement = <HTMLTextAreaElement>document.getElementById("output");

const printToOutput = function (line: string):void {
  outputBuffer.push(line);
  outputTextArea.value = outputBuffer.join("");
}

const main = async () => {
  browserVm = new BrowserVm()
  await browserVm.createVm(printToOutput)

  document.getElementById("input").onkeydown = checkRunWithKeyboard;
  document.getElementById("run").onclick = runRubyScriptsInHtml;
  document.getElementById("clear").onclick = selectAllScripts;
  document.getElementById("files").onclick = listFiles;

  runRubyScriptsInHtml();
};

const checkRunWithKeyboard = function(event: KeyboardEvent) {
  if (event.ctrlKey && event.key == "Enter") {
    runRubyScriptsInHtml();
  } 
}

export const runRubyScriptsInHtml = function () {
  outputBuffer = [];

  try {
    const result = browserVm.vm.eval(codeEditor.getValue());
  
    if (outputBuffer.length == 0) {
      outputTextArea.value = result.toString()
    }  
  } catch (error) {
    outputTextArea.value = error;
  }

  listFiles();
};

export const selectAllScripts = function () {
  codeEditor.focus();
  // inputTextArea.select(); // TODO: select all
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

filetree(File.expand_path(Dir.pwd))
  `; 

  files.value = browserVm.vm.eval(script).toString()
};

main();
