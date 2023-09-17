import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { api } from "@/lib/axios";

interface Video {
  id: string;
  name: string;
  path: string;
  transcription: string;
}

interface PromptSelectProps {
  onVideoSelect: (template: Video) => void;
}

export function PromptSelect({ onVideoSelect }: PromptSelectProps) {
  const [videos, setVideos] = useState<Video[] | null>(null);

  useEffect(() => {
    api.get("/videos").then((res) => {
      setVideos(res.data);
    });
  }, []);

  function handlePromptSelected(id: string) {
    const selectedVideo = videos?.find((video) => video.id == id);

    if (!selectedVideo) return;
    return onVideoSelect(selectedVideo);
  }

  return (
    <Select onValueChange={handlePromptSelected}>
      <SelectTrigger>
        <SelectValue placeholder="Selecione um prompt..." />
      </SelectTrigger>
      <SelectContent>
        {videos?.map((video) => {
          return (
            <SelectItem key={video.id} value={video.id}>
              {video.name}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
