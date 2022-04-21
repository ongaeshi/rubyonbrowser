import { BrowserVm } from "./browserVm";
import CodeMirror from "codemirror";
import "codemirror/mode/ruby/ruby";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/rubyblue.css";
import "codemirror/addon/edit/matchbrackets";
import "codemirror/addon/edit/closebrackets";
import "./style.css";
import LZString from "lz-string"

let browserVm:BrowserVm;

let outputBuffer:string[] = [];

const codeEditor = CodeMirror.fromTextArea(
  document.getElementById("input") as HTMLTextAreaElement,
  {
    theme: 'rubyblue',
    mode: "text/x-ruby",
    indentUnit: 2,
    matchBrackets: true,
    autoCloseBrackets: true
  }
);

codeEditor.setOption("extraKeys", {
  "Ctrl-Enter": function(cm) {
    runRubyScriptsInHtml()
  }
});

const outputTextArea:HTMLTextAreaElement = <HTMLTextAreaElement>document.getElementById("output");

const printToOutput = function (line: string):void {
  outputBuffer.push(line);
  outputTextArea.value = outputBuffer.join("");
}

const main = async () => {
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const code = urlParams.get('q')
  if (code !== null) {
    if (code === "") {
      codeEditor.setValue("")
    } else {
      codeEditor.setValue(LZString.decompressFromEncodedURIComponent(code))
    }
  }

  browserVm = new BrowserVm()
  await browserVm.createVm(printToOutput)

  document.getElementById("run").onclick = runRubyScriptsInHtml;
  document.getElementById("clear").onclick = selectAllScripts;
  document.getElementById("files").onclick = listFiles;

  codeEditor.focus();

  runRubyScriptsInHtml();
};

export const runRubyScriptsInHtml = function () {
  outputBuffer = [];

  try {
    // Rewrite URL
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    urlParams.set("q", LZString.compressToEncodedURIComponent(codeEditor.getValue()))
    history.replaceState('', '', "?" + urlParams.toString());

    // Run eval
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
  codeEditor.execCommand("selectAll");
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
