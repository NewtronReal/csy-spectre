import { useState, useRef, useEffect } from "react";
import "./App.css"

class CustomCPU {
  constructor() {
      this.registers = { $r1: 0, $r2: 0, $r3: 0, $r4: 0 };
      this.memory = [];
      for(var i =0;i<128;i++){
          this.memory[i] = 0;
      }
      var k = "Hey this is some random bullshit"
      for(var i=128;i<k.length+128;i++){
          this.memory[i]=k[i-128].charCodeAt(0)
      }
      var key = "Sp3culat1on_1s_H4rd!"
      for(var i=160;i<key.length+160;i++){
          this.memory[i]=key[i-160].charCodeAt(0)
      }
      for(var i=180;i<256;i++){
          this.memory[i]=0;
      }
      this.memory[255] = 0
      this.bounds = [0,160]
      this.cache = []
  }

  batches(text){
    var blist = text.split('batch:')
    var output = ""
    var line = 0
    for(var i in blist){
        var blistn = blist[i].split('\n')
        if(blist[i]=='') {continue}
        output+="\n"+this.batch(blistn,line)+"\n--BATCHEND"+i+"--\n"
    }
    return output
  }

  batch(list,start=0){
      const prevstate = [structuredClone(this.memory),structuredClone(this.cache),structuredClone(this.registers)]
      var oob=[]
      var time = 0;
      var statuscode =[-1,0]
      var output = ""
      for(var i in list){
          if(list[i].trim()==''){
            continue
          }
          oob[i] = this.parse(list[i])
      }
      for(var i in oob){
          if(oob[i][0]!=0){
              statuscode = [i,oob[i][0]]
          }
          time+=oob[i][1]
          if(statuscode[0]==-1){
              output+=(oob[i][2])+"\n"
          }
      }
      if(statuscode[0]!=-1){
          output+=("line "+(start+parseInt(statuscode[0]))+" thrown error "+statuscode[1])+"\n"
          this.memory = prevstate[0]
          this.cache = prevstate[1]
          this.registers = prevstate[2]
      }else{
          output+=("finished\n")
      }
      return output+"\n"+(time+(Math.random()*20))+"ns"
  }

  parse(command) {
      let tokens = command.trim().split(/\s+/);
      if (tokens.length === 0) return['','',''];
      if (tokens[0]=="#") return ['','',''];

      let [op, reg, mem] = tokens;

      switch (op) {
          case "load":
              return (this.load(reg, mem));
          case "set":
              return this.set(reg, mem);
          case "print":
              return (this.print(reg));
          case "flush":
              return (this.flush(reg));
          default:
              return ([3,20,'unknown command']);
      }
  }

  load(reg, mem) {
      if (!(reg in this.registers)) return console.error(`Invalid register: ${reg}`);

      let addr = this.getMemoryAddress(mem);
      if (addr === null) return;

      var timestamp = 20
      if(this.cache[addr]==undefined){
          timestamp =50;
          this.cache[addr] = this.memory[addr]
      }
      this.registers[reg] = this.cache[addr];
      if(addr>this.bounds[1] || addr<this.bounds[0]){
          return [1,timestamp,'']
      }else{
          return [0,timestamp,'']
      }
  }

  set(reg, mem) {
      if (!(reg in this.registers)) return console.error(`Invalid register: ${reg}`);
      var timestamp = 20
      let addr = this.getMemoryAddress(mem);
      if (addr === null) return;
      
      this.cache[addr] = this.registers[reg];

      if(addr>this.bounds[1] || addr<this.bounds[0]){
          return [1,timestamp,'']
      }else{
          return [0,timestamp,'']
      }
  }

  print(reg) {
      var timestamp = 80;
      if (!(reg in this.registers)) return [2,20,'']
      return [0,timestamp,this.registers[reg]]
  }

  flush(mem) {
      var timestamp = 20;
      let addr = this.getMemoryAddress(mem);
      if (addr === null) return;

      if(this.cache[addr]!=undefined){
          this.memory[addr] = this.cache[addr];
          delete this.cache[addr];
          timestamp = 60
      }
      if(addr>this.bounds[1] || addr<this.bounds[0]){
          return [1,timestamp,'']
      }else{
          return [0,timestamp,'']
      }
  }

  getMemoryAddress(mem) {
      if (!mem) {
          console.error("Memory reference is required.");
          return null;
      }

      if (/^\d+$/.test(mem)) return parseInt(mem);

      let match = mem.match(/^(-?\d*)\(\$(r\d)\)$/);
      if (match) {
          let [, offset, baseReg] = match;
          offset = offset === "" ? 0 : parseInt(offset);
          
          if (!(`$${baseReg}` in this.registers)) {
              console.error(`Invalid register: $${baseReg}`);
              return null;
          }
          return this.registers[`$${baseReg}`] + offset;
      }

      console.error(`Invalid memory reference: ${mem}`);
      return null;
  }
}

export default function ShellScriptRunner() {
  const [code, setCode] = useState("# Type shell commands here...\necho Hello World");
  const [output, setOutput] = useState("");
  const containerRef = useRef(null);
  const [dividerPosition, setDividerPosition] = useState(50);
  const [dragging, setDragging] = useState(false);
  const textAreaRef = useRef(null);
  const lineNumberRef = useRef(null);
  const cpu = new CustomCPU();

  // Execute commands
  const runCode = () => {
    let result = cpu.batches(code)
    setOutput(result);
  };

  // Handle panel resizing
  const startDragging = () => setDragging(true);
  const stopDragging = () => setDragging(false);
  const handleMouseMove = (e) => {
    if (!dragging) return;
    const rect = containerRef.current.getBoundingClientRect();
    const newPosition = ((e.clientX - rect.left) / rect.width) * 100;
    if (newPosition > 20 && newPosition < 80) setDividerPosition(newPosition);
  };

  // Sync line numbers with textarea
  useEffect(() => {
    const syncScroll = () => {
      if (lineNumberRef.current && textAreaRef.current) {
        lineNumberRef.current.scrollTop = textAreaRef.current.scrollTop;
      }
    };
    textAreaRef.current?.addEventListener("scroll", syncScroll);
    return () => textAreaRef.current?.removeEventListener("scroll", syncScroll);
  }, []);

  return (
    <div
      ref={containerRef}
      className="container"
      onMouseMove={handleMouseMove}
      onMouseUp={stopDragging}
    >
      {/* Left Panel - Editor with Line Numbers */}
      <div className="editor" style={{ width: `${dividerPosition}%` }}>
        <div className="editor-container">
          <div ref={lineNumberRef} className="line-numbers">
            {code.split("\n").map((_, i) => (
              <div key={i} className="line-number">
                {i + 1}
              </div>
            ))}
          </div>
          <textarea
            ref={textAreaRef}
            className="text-area"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        <button className="run-btn" onClick={runCode}>
          ▶ Run
        </button>
      </div>

      {/* Divider */}
      <div className="divider" onMouseDown={startDragging} />

      {/* Right Panel - Terminal Output */}
      <div className="terminal" style={{ width: `${100 - dividerPosition}%` }}>
        <pre>{output}</pre>
      </div>
    </div>
  );
}