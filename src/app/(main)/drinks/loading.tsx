import { TextLoader } from "@/components/ui/text-loader";
import { phrasesFor } from "@/lib/james/loading-phrases";

export default function Loading() {
  return <TextLoader phrases={phrasesFor("drinks")} />;
}
