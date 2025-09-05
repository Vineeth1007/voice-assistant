// app/page.tsx or wherever you use it
import Stage3Page from "@/components/Stage3Page";

import { uploadAudio, submitTranscript } from "@/lib/api";
export default function Page() {
  return <Stage3Page />;
}
