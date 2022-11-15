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

(window as any).frameBuffer = new Uint32Array(100*100);
let frameBuffer:Uint32Array = (window as any).frameBuffer;

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

    // Clear framebuffer
    frameBuffer.set(new Uint8Array(100*100));

    // Run eval
    const src = `
    require "js"

    def set_pixel(x, y, color)
      JS::eval("frameBuffer[#{y} * 100 + #{x}] = #{color}")
    end
    `
    const result = browserVm.vm.eval(src + "\n" + codeEditor.getValue());

    if (outputBuffer.length == 0) {
      outputTextArea.value = result.toString()
    }

    const canvasdiv = document.getElementById("canvasdiv");

    const isPixelWritten = frameBuffer.findIndex((e) => e !== 0) != -1

    if (isPixelWritten) {
      canvasdiv.style.display = "block";
      writeToCanvas();
    } else {
      canvasdiv.style.display = "none";
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


// quick and dirty image data scaling
// see: https://stackoverflow.com/questions/3448347/how-to-scale-an-imagedata-in-html-canvas
const scaleImageData = (imageData: any, scale: any, ctx: any) => {
  const scaled = ctx.createImageData(imageData.width * scale, imageData.height * scale);
  const subLine = ctx.createImageData(scale, 1).data;
  for (let row = 0; row < imageData.height; row++) {
      for (let col = 0; col < imageData.width; col++) {
          const sourcePixel = imageData.data.subarray((row * imageData.width + col) * 4, (row * imageData.width + col) * 4 + 4);
          for (let x = 0; x < scale; x++)
              subLine.set(sourcePixel, x * 4);
          for (let y = 0; y < scale; y++) {
              const destRow = row * scale + y;
              const destCol = col * scale;
              scaled.data.set(subLine, (destRow * scaled.width + destCol) * 4);
          }
      }
  }
  return scaled;
};

function writeToCanvas() {
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;

  const context = canvas.getContext("2d");
  const imgData = context.createImageData(100, 100);
  for (let i = 0; i < 100 * 100; i++) {
    const c:number = frameBuffer[i];
    imgData.data[i * 4] = (c >> 24) & 0xff;
    imgData.data[i * 4 + 1] = (c >> 16) & 0xff;
    imgData.data[i * 4 + 2] = (c >> 8) & 0xff;
    imgData.data[i * 4 + 3] = c & 0xff;
  }
  const data = scaleImageData(imgData, 3, context);
  context.putImageData(data, 0, 0);
}

main();
