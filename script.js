const fileInput = document.getElementById("fileInput");
const songName = document.getElementById("songName");
const convertBtn = document.getElementById("convertBtn");
const player = document.getElementById("player");
const downloadLink = document.getElementById("downloadLink");
const strengthSlider = document.getElementById("strength");
const canvas = document.getElementById("waveform");
const ctx = canvas.getContext("2d");

let currentFile = null;

fileInput.addEventListener("change", () => {

    currentFile = fileInput.files[0];

    if(currentFile){
        songName.textContent = currentFile.name;
        drawWave(currentFile);
    }

});

async function drawWave(file){

    const ac = new AudioContext();

    const buffer =
        await file.arrayBuffer();

    const audio =
        await ac.decodeAudioData(buffer);

    const data =
        audio.getChannelData(0);

    canvas.width = canvas.offsetWidth;
    canvas.height = 120;

    ctx.clearRect(0,0,canvas.width,canvas.height);

    ctx.beginPath();

    const step =
        Math.ceil(data.length / canvas.width);

    for(let i=0;i<canvas.width;i++){

        let min = 1;
        let max = -1;

        for(let j=0;j<step;j++){

            const sample =
                data[i*step+j] || 0;

            if(sample < min) min = sample;
            if(sample > max) max = sample;
        }

        ctx.moveTo(
            i,
            (1+min)*60
        );

        ctx.lineTo(
            i,
            (1+max)*60
        );
    }

    ctx.strokeStyle = "#fff";
    ctx.stroke();

}

convertBtn.addEventListener("click", async ()=>{

    if(!currentFile){
        alert("曲を選択");
        return;
    }

    const strength =
        Number(strengthSlider.value) / 100;

    const ac = new AudioContext();

    const buffer =
        await currentFile.arrayBuffer();

    const audio =
        await ac.decodeAudioData(buffer);

    const source =
        audio.getChannelData(0);

    const out =
        new Float32Array(source.length);

    const crush =
        4 + Math.floor((1-strength)*12);

    const sampleHold =
        Math.floor(2 + strength*12);

    let held = 0;

    for(let i=0;i<source.length;i++){

        if(i % sampleHold === 0){
            held = source[i];
        }

        let s = held;

        s =
            Math.round(
                s * crush
            ) / crush;

        s =
            Math.tanh(
                s * (1 + strength*8)
            );

        if(s > 0){
            s = 0.8;
        }else{
            s = -0.8;
        }

        out[i] = s;
    }

    const wav =
        encodeWav(
            out,
            audio.sampleRate
        );

    const url =
        URL.createObjectURL(wav);

    player.src = url;
    downloadLink.href = url;

});

function encodeWav(samples,sampleRate){

    const buffer =
        new ArrayBuffer(
            44 + samples.length*2
        );

    const view =
        new DataView(buffer);

    function write(o,s){
        for(let i=0;i<s.length;i++){
            view.setUint8(
                o+i,
                s.charCodeAt(i)
            );
        }
    }

    write(0,"RIFF");

    view.setUint32(
        4,
        36+samples.length*2,
        true
    );

    write(8,"WAVE");
    write(12,"fmt ");

    view.setUint32(16,16,true);
    view.setUint16(20,1,true);
    view.setUint16(22,1,true);
    view.setUint32(24,sampleRate,true);
    view.setUint32(28,sampleRate*2,true);
    view.setUint16(32,2,true);
    view.setUint16(34,16,true);

    write(36,"data");

    view.setUint32(
        40,
        samples.length*2,
        true
    );

    let offset = 44;

    for(let i=0;i<samples.length;i++){

        const s =
            Math.max(
                -1,
                Math.min(
                    1,
                    samples[i]
                )
            );

        view.setInt16(
            offset,
            s < 0
            ? s*0x8000
            : s*0x7fff,
            true
        );

        offset += 2;
    }

    return new Blob(
        [view],
        {type:"audio/wav"}
    );
}
