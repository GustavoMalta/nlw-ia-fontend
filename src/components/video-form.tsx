import { FileVideo, Upload } from "lucide-react";
import { Separator } from "./ui/separator";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { getFFmpeg } from "@/lib/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { api } from "@/lib/axios";

type Status = "waiting" | "converting" | "uploading" | "generating" | "success";

const StatusMessages = {
  converting: "Convertendo",
  uploading: "Carregando",
  generating: "Transcrevendo...",
  success: "Sucesso!",
};

interface VideoInputFormProps {
  onVideoUploaded: (id: string) => void;
}

export function VideoInputForm({ onVideoUploaded }: VideoInputFormProps) {
  const [video, setVideo] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("waiting");

  const [progressValue, setProgress] = useState<number | null>(null);

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
      if (progress <= 1) setProgress(Math.round(progress * 100));
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
    const audioFile = new File([audioFileBlob], video?.name + ".mp3", {
      type: "audio/mpeg",
    });

    console.log("Finish conversion: ", audioFile.name);

    return audioFile;
  }

  function handleFileSelection(e: ChangeEvent<HTMLInputElement>) {
    const { files } = e.currentTarget;
    if (!files) return;
    const selectedFile = files[0];
    setStatus("waiting");
    setProgress(null);
    setVideo(selectedFile);
  }
  async function handleUploadVideo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const prompt = promptInputRef.current?.value;

    if (!video || progressValue != null) {
      return;
    }

    setProgress(0);
    setStatus("converting");

    //convert to mp3
    const audioFile = await convertVideoToAudio(video);

    const data = new FormData();

    data.append("file", audioFile);

    setStatus("uploading");

    const response = await api.post("/videos", data);
    console.log(response.data);
    const videoId = response.data.id;

    setStatus("generating");

    await api.post(`/videos/${videoId}/transcription`, { prompt });

    setStatus("success");
    onVideoUploaded(videoId);
    console.log("finalizado");
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
      <Button
        data-success={status === "success"}
        className="flex w-full data-[success=true]:bg-emerald-500"
        type="submit"
        disabled={status !== "waiting"}
      >
        {status === "waiting" ? (
          <>
            Carregar vídeo
            <Upload className="w-4 h-4 ml-2" />
          </>
        ) : (
          `
        ${StatusMessages[status]} ${
            status == "converting" ? progressValue + "%" : ""
          }
        `
        )}
      </Button>
    </form>
  );
}
