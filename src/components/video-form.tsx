import { FileVideo, Upload } from "lucide-react";
import { Separator } from "./ui/separator";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getFFmpeg } from "@/lib/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { api } from "@/lib/axios";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

type Status = "waiting" | "converting" | "uploading" | "generating" | "success";

const StatusMessages = {
  converting: "Convertendo",
  uploading: "Carregando",
  generating: "Transcrevendo...",
  success: "Sucesso!",
};

interface VideoProps {
  id: string;
  name?: string;
  transcription?: string;
  createdAt?: Date;
}
interface VideoInputFormProps {
  onVideoUploaded: ({ id, transcription }: VideoProps) => void;
}

export function VideoInputForm({ onVideoUploaded }: VideoInputFormProps) {
  const [video, setVideo] = useState<File | null>(null);
  const [videos, setVideos] = useState<VideoProps[]>([]);
  const [videoSelected, setVideoSelected] = useState<VideoProps | null>(null);
  const [tabSelected, setTabSelected] = useState<string>("upload");
  const [status, setStatus] = useState<Status>("waiting");

  const [progressValue, setProgress] = useState<number | null>(null);

  const previewVideo = useMemo(() => {
    if (!video) return "";

    return URL.createObjectURL(video);
  }, [video]);

  const getVideos = () => {
    api.get("/videos").then((res) => setVideos(res.data));
  };

  useEffect(() => {
    getVideos();
  }, []);

  const handleSelectVideo = (id: string) => {
    if (!id) return;
    api.get("/videos/" + id).then((res) => {
      onVideoUploaded(res.data);
      setVideoSelected(res.data);
    });
  };

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
    const videoId = response.data.id;

    setStatus("generating");

    const { data: transcriptionData } = await api.post(
      `/videos/${videoId}/transcription`,
      { prompt }
    );

    setStatus("success");
    getVideos();
    onVideoUploaded({
      id: videoId,
      transcription: transcriptionData.transcription,
    });
    setVideoSelected(response.data);
    console.log("finalizado");
  }
  const renderVideoPreview = () => {
    return (
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
    );
  };

  return (
    <form className="space-y-4" onSubmit={handleUploadVideo}>
      <Tabs
        defaultValue="upload"
        className="w-auto"
        onValueChange={setTabSelected}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="select">Selecionar</TabsTrigger>
        </TabsList>
        <TabsContent value="upload">{renderVideoPreview()}</TabsContent>
        <TabsContent value="select" className="my-6 ">
          <Select
            onValueChange={handleSelectVideo}
            disabled={!["waiting", "success"].includes(status)}
            defaultValue={videoSelected?.id}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um vídeo..." />
            </SelectTrigger>
            <SelectContent>
              {videos.map((item) => {
                return (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </TabsContent>
      </Tabs>
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
      {tabSelected === "upload" && (
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
      )}
    </form>
  );
}
