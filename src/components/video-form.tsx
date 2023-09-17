import { FileVideo, Upload } from "lucide-react";
import { Separator } from "./ui/separator";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { getFFmpeg } from "@/lib/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

export function VideoInputForm() {
  const [video, setVideo] = useState<File | null>(null);

  const previewVideo = useMemo(() => {
    if (!video) return "";

    return URL.createObjectURL(video);
  }, [video]);

  const promptInputRef = useRef<HTMLTextAreaElement>(null);

  async function convertVideoToAudio(videoFile: File) {
    console.log("Start convert", video?.name);

    const ffmpeg = await getFFmpeg();

    await ffmpeg.writeFile("video.mp4", await fetchFile(videoFile));

    // ffmpeg.on("log", (log) => {
    //   console.log("LOG:", log);
    // });

    ffmpeg.on("progress", ({ progress }) => {
      console.log("progress:", Math.round(progress * 100));
    });

    await ffmpeg.exec([
      "-i",
      "video.mp4",
      "-map",
      "0:a",
      "-b:a",
      "20k",
      "-acodec",
      "libmp3lame",
      "output.mp3",
    ]);

    const dataAudio = await ffmpeg.readFile("output.mp3");
    const audioFileBlob = new Blob([dataAudio], { type: "audio/mpeg" });
    const audioFile = new File([audioFileBlob], "audio.mp3", {
      type: "audio/mpeg",
    });

    console.log("Finish conversion: ", audioFile.name);

    return audioFile;
  }

  function handleFileSelection(e: ChangeEvent<HTMLInputElement>) {
    const { files } = e.currentTarget;
    if (!files) return;
    const selectedFile = files[0];

    setVideo(selectedFile);
  }
  async function handleUploadVideo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const prompt = promptInputRef.current?.value;

    if (!video) {
      return;
    }

    //convert to mp3
    const audioFile = await convertVideoToAudio(video);
    console.log(audioFile);
  }

  return (
    <form className="space-y-6" onSubmit={handleUploadVideo}>
      <label
        htmlFor="video"
        className="border border-dashed rounded-md flex aspect-video cursor-pointer text-sm gap-2 items-center justify-center text-muted-foreground hover:bg-primary/5"
      >
        {video ? (
          <video
            src={previewVideo}
            controls={false}
            className="pointer-events-none"
          />
        ) : (
          <>
            <FileVideo className="h-4 w-4" /> "Selecione o vídeo"
          </>
        )}
      </label>
      <input
        type="file"
        id="video"
        accept="video/mp4"
        className="sr-only"
        onChange={handleFileSelection}
      />
      <Separator />
      <div className="space-y-2">
        <Label htmlFor="transcription_prompt">Prompt de transcrição</Label>
        <Textarea
          ref={promptInputRef}
          className="h-20 leading-relaxed"
          placeholder="Inclua palavras-chave mencionadas no vídeo separadas por vírgula ( , )"
          id="transcription_prompt"
        />
      </div>
      <Button className="flex w-full" type="submit">
        Carregar vídeo
        <Upload className="w-4 h-4 ml-2" />
      </Button>
    </form>
  );
}
