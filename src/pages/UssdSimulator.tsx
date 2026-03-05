import { useState, useRef, useEffect } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Smartphone, Send, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  type: "user" | "system";
  text: string;
}

const UssdSimulator = () => {
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [phoneNumber, setPhoneNumber] = useState("+255700000000");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [textAccum, setTextAccum] = useState("");
  const [ended, setEnded] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendUssd = async (userInput: string) => {
    const newTextAccum = textAccum ? `${textAccum}*${userInput}` : userInput;

    if (userInput) {
      setMessages((prev) => [...prev, { type: "user", text: userInput }]);
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("sessionId", sessionId);
      formData.append("phoneNumber", phoneNumber);
      formData.append("text", userInput === "" ? "" : newTextAccum);

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/ussd-callback`,
        { method: "POST", body: formData }
      );

      const responseText = await res.text();
      const isCon = responseText.startsWith("CON ");
      const isEnd = responseText.startsWith("END ");
      const displayText = responseText.replace(/^(CON |END )/, "");

      setMessages((prev) => [...prev, { type: "system", text: displayText }]);
      setTextAccum(userInput === "" ? "" : newTextAccum);

      if (isEnd) {
        setEnded(true);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { type: "system", text: `Error: ${err.message}` },
      ]);
      setEnded(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    if (ended || loading) return;
    sendUssd(input);
    setInput("");
  };

  const handleReset = () => {
    setSessionId(crypto.randomUUID());
    setMessages([]);
    setTextAccum("");
    setEnded(false);
    setInput("");
  };

  const startSession = () => {
    setMessages([]);
    setTextAccum("");
    setEnded(false);
    sendUssd("");
  };

  return (
    <div>
      <PageHeader
        title="USSD Simulator"
        description="Test the USSD flow without a real phone"
      />

      <div className="max-w-md mx-auto">
        <Card className="border-2 border-border rounded-2xl overflow-hidden">
          {/* Phone Header */}
          <CardHeader className="bg-muted/50 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-muted-foreground" />
                <CardTitle className="text-sm">USSD Session</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="gap-1 text-xs"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </Button>
            </div>
            <div className="mt-2">
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+255700000000"
                className="text-xs h-8"
              />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Message Area */}
            <ScrollArea className="h-[400px]">
              <div className="p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Smartphone className="w-10 h-10 mb-3 opacity-40" />
                    <p className="text-sm">Press "Dial" to start a USSD session</p>
                    <Button
                      onClick={startSession}
                      className="mt-4 gap-2"
                      size="sm"
                    >
                      <Send className="w-3 h-3" /> Dial
                    </Button>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${
                        msg.type === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                          msg.type === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))
                )}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            {messages.length > 0 && (
              <div className="border-t border-border p-3">
                {ended ? (
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-2">
                      Session ended
                    </p>
                    <Button onClick={startSession} size="sm" variant="outline" className="gap-1">
                      <RotateCcw className="w-3 h-3" /> New Session
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSend()}
                      placeholder="Enter response…"
                      className="text-sm"
                      disabled={loading}
                      autoFocus
                    />
                    <Button
                      onClick={handleSend}
                      size="icon"
                      disabled={loading}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UssdSimulator;
