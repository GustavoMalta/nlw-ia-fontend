import { Github, Wand, Check } from "lucide-react";
import { Button } from "./components/ui/button";
import { Separator } from "./components/ui/separator";
import { Textarea } from "./components/ui/textarea";
import { Label } from "./components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import { Slider } from "./components/ui/slider";
import { useState } from "react";
import { VideoInputForm } from "./components/video-form";
import { PromptSelect } from "./components/prompt-select";
import { useCompletion } from "ai/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";

interface VideoProps {
  id: string;
  transcription?: string;
}
const VideoDefault = {
  id: "",
  transcription: "",
};

export function App() {
  const [temperature, setTemperature] = useState(0.5);
  const [video, setVideo] = useState<VideoProps>(VideoDefault);

  const {
    input,
    completion,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading,
  } = useCompletion({
    api: import.meta.env.NLW_BASEURL + "/ai/complete",
    body: {
      videoId: video.id,
      temperature,
    },
    headers: {
      "Content-Type": "application/json",
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <div className="px-6 py-3 flex items-center justify-between border-b">
        <h1 className="text-xl font-bold">Upload A.I. </h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Next Leevel Week I.A. 🤖️
          </span>
          <Separator orientation={"vertical"} className="h-6" />
          <Button
            variant={"outline"}
            onClick={() =>
              window.open(
                "https://github.com/GustavoMalta/nlw-ia-fontend",
                "_blank",
                "noreferrer"
              )
            }
          >
            <Github className="w-4 h-4 mr-2" />
            GitHub
          </Button>
        </div>
      </div>

      <main className="flex-1 p-6 flex gap-6">
        <div className="flex flex-col flex-1 gap-4">
          <div className="grid grid-rows-2 gap-4 flex-1">
            <Tabs defaultValue="promptInput" className="w-auto grid">
              <div className="flex flex-col">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="promptInput">
                    Prompt
                    {input && (
                      <Check className="w-4 h-4 ml-2 bg-emerald-950 border  " />
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="transcriptionInput">
                    Transcrição
                    {video.transcription && (
                      <Check className="w-4 h-4 ml-2 bg-emerald-950 border  " />
                    )}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="promptInput" className="my-6 flex-1">
                  <Textarea
                    value={input}
                    onChange={handleInputChange}
                    className="resize-none p-4 leading-relaxed h-full"
                    placeholder="Inclua o prompt para a IA..."
                  />
                </TabsContent>
                <TabsContent value="transcriptionInput" className="my-6 flex-1">
                  <Textarea
                    value={video.transcription || ""}
                    readOnly
                    className="resize-none p-4 leading-relaxed h-full"
                    placeholder="Transcrição do vídeo..."
                  />
                </TabsContent>
              </div>
            </Tabs>

            <Textarea
              value={completion}
              className="resize-none p-4 leading-relaxed"
              placeholder="Resultado gerado pela IA..."
              readOnly
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Lembre-se: Você pode Utiliazr a variável
            <code className="text-violet-400">{" {transcription} "}</code>no seu
            prompt para adicionar o conteúdo do vídeo selecionado.
          </p>
        </div>
        <aside className="w-80 space-y-5">
          <VideoInputForm onVideoUploaded={setVideo} />

          <Separator />

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label>Prompt</Label>
              <PromptSelect onPromptSelect={setInput} />
            </div>

            <div className="space-y-2">
              <Label>Modelo</Label>
              <Select disabled defaultValue="gpt3.5">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt3.5">GPT 3.5-Turbo 16k</SelectItem>
                </SelectContent>
              </Select>
              <span className="block text-xs text-muted-foreground">
                Você poderá customizar essa opção em breve
              </span>
            </div>

            <Separator />

            <div className="space-y-4">
              <Label>Temperatura {temperature * 10}</Label>
              <Slider
                value={[temperature]}
                min={0}
                max={1}
                step={0.1}
                onValueChange={([e]) => setTemperature(e)}
              />
              <span className="block text-xs text-muted-foreground">
                Valores mais altos tenden a deixar o resultado mais criativo e
                com possíveis erros
              </span>
            </div>
            <Separator />
            <Button
              className="w-full"
              type="submit"
              disabled={isLoading || !video.transcription || !input}
            >
              {isLoading ? (
                "Gerando..."
              ) : (
                <>
                  Executar <Wand className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>
        </aside>
      </main>
    </div>
  );
}
