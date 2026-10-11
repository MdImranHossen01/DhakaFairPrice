'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Bot, User, Loader2, Sparkles, Package, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ProductCardV1 from '@/components/templates/product-cards/ProductCardV1';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  products?: any[];
  orderDraft?: any;
  placedOrder?: any;
}

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');

  const parseMarkdownInline = (text: string, baseKey: string | number): React.ReactNode[] => {
    const inlineRegex = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
    const result: React.ReactNode[] = [];
    let last = 0;
    let match;
    let counter = 0;

    const cleanStr = (s: string) => s.replace(/\*\*/g, '');

    while ((match = inlineRegex.exec(text)) !== null) {
      if (match.index > last) {
        result.push(cleanStr(text.substring(last, match.index)));
      }
      if (match[2]) {
        result.push(
          <strong key={`${baseKey}-b-${counter++}`} className="font-bold text-foreground">
            {match[2]}
          </strong>
        );
      } else if (match[3]) {
        result.push(
          <em key={`${baseKey}-i-${counter++}`} className="italic">
            {match[3]}
          </em>
        );
      }
      last = inlineRegex.lastIndex;
    }

    if (last < text.length) {
      result.push(cleanStr(text.substring(last)));
    }

    return result.length > 0 ? result : [cleanStr(text)];
  };

  const renderMessageContent = (content: string, products?: any[]) => {
    const parts: React.ReactNode[] = [];
    // Match markdown links with optional surrounding bold/italic asterisks: **[text](url)** or *[text](url)*
    const regex = /(?:\*\*|\*)?\[([^\]]+)\]\(([^)]+)\)(?:\*\*|\*)?/g;
    let lastIndex = 0;
    let match;
    const usedProductIds = new Set<string>();

    while ((match = regex.exec(content)) !== null) {
      const [fullMatch, text, url] = match;
      const matchIndex = match.index;

      if (matchIndex > lastIndex) {
        const textSegment = content.substring(lastIndex, matchIndex);
        parts.push(...parseMarkdownInline(textSegment, matchIndex));
      }

      const isRelative = url.startsWith('/') && !url.startsWith('//');
      const isHttp = url.startsWith('http://') || url.startsWith('https://');
      const isMailto = url.startsWith('mailto:');

      if (!isRelative && !isHttp && !isMailto) {
        parts.push(...parseMarkdownInline(fullMatch, `raw-${matchIndex}`));
      } else {
        const isProductLink = url.startsWith('/product/');
        let matchedProduct = null;

        if (isProductLink && products && products.length > 0) {
          const cleanSlug = url.replace('/product/', '').split(/[?#]/)[0];
          matchedProduct = products.find(
            (p: any) => p.slug === cleanSlug || String(p._id) === cleanSlug
          );
        }

        if (matchedProduct) {
          usedProductIds.add(String(matchedProduct._id));
          parts.push(
            <span key={`product-inline-${matchIndex}`} className="block my-2.5 w-full text-left">
              <ProductCardV1 product={matchedProduct} />
            </span>
          );
        } else {
          const isExternal = isHttp;
          parts.push(
            <Link
              key={`link-${matchIndex}`}
              href={url}
              onClick={() => setIsOpen(false)}
              className="underline text-primary hover:opacity-80 font-bold"
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noopener noreferrer" : undefined}
            >
              {text}
            </Link>
          );
        }
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      const remaining = content.substring(lastIndex);
      parts.push(...parseMarkdownInline(remaining, `tail-${lastIndex}`));
    }

    // If there are products returned from DB that were not directly linked in the text
    const remainingProducts = (products || []).filter(
      (p: any) => !usedProductIds.has(String(p._id))
    );

    if (remainingProducts.length > 0) {
      parts.push(
        <span key="remaining-products" className="block mt-3 pt-2 border-t border-border/40 w-full">
          <span className="text-[11px] font-bold text-muted-foreground flex items-center justify-between uppercase tracking-wider mb-2.5">
            <span className="flex items-center gap-1.5">
              <Sparkles className="size-3 text-primary animate-pulse" />
              Suggested Products
            </span>
          </span>
          <span className="flex flex-col gap-3.5 w-full">
            {remainingProducts.slice(0, 10).map((prod: any) => (
              <span key={prod._id} className="block w-full text-left">
                <ProductCardV1 product={prod} />
              </span>
            ))}
          </span>
        </span>
      );
    }

    return parts.length > 0 ? parts : content;
  };
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Assalamu Alaikum! I am your Swapnobaz AI assistant. How can I help you explore our products, track orders, or assist with reseller dropshipping today?' },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [orderingIndex, setOrderingIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  const handleConfirmOrder = async (draft: any, msgIndex: number) => {
    if (!draft || orderingIndex !== null) return;
    setOrderingIndex(msgIndex);
    try {
      const res = await fetch('/api/chat/place-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: draft.productId || draft.product?._id,
          quantity: draft.quantity || 1,
          color: draft.color,
          size: draft.size,
          fullName: draft.fullName,
          phone: draft.phone,
          street: draft.street,
          city: draft.city,
          state: draft.state,
          division: draft.division,
          notes: draft.notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to place order');
      }

      // Update message with placed order details
      setMessages((prev) =>
        prev.map((m, idx) =>
          idx === msgIndex ? { ...m, placedOrder: data.order } : m
        )
      );

      // Add celebratory confirmation message from AI
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `🎉 ধন্যবাদ **${draft.fullName}**! আপনার অর্ডারটি নিশ্চিত করা হয়েছে এবং সিস্টেমে লিপিবদ্ধ হয়েছে।\n\n**অর্ডার আইডি:** #${data.order.shortId}\n**মোট প্রদেয় মূল্য:** ৳${data.order.totalAmount} (Cash on Delivery)\n\nখুব শীঘ্রই আমাদের ডেলিভারি টিম আপনার সাথে ফোনে যোগাযোগ করবে। আপনি চাইলে নিচে ট্র্যাকিং বাটনে ক্লিক করে লাইভ স্ট্যাটাস দেখতে পারেন।`,
        },
      ]);
    } catch (error: any) {
      console.error('Order placement error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `দুঃখিত, অর্ডারটি কনফার্ম করতে সমস্যা হয়েছে: ${error.message || 'অনুগ্রহ করে পুনরায় চেষ্টা করুন।'}`,
        },
      ]);
    } finally {
      setOrderingIndex(null);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userInput = input.trim();
    const cleanLower = userInput.toLowerCase();
    const isConfirmWord = /^(confirm|কনফার্ম|হ্যাঁ|yes|sure|ok|order|ঠিক আছে)[\s!.]*$/i.test(cleanLower);

    // If user typed "confirm" and there's an unplaced order draft in messages
    const draftIndex = messages.map((m, i) => ({ m, i })).reverse().find(x => x.m.orderDraft && !x.m.placedOrder)?.i;

    if (isConfirmWord && draftIndex !== undefined) {
      const userMessage: Message = { role: 'user', content: userInput };
      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      const targetDraft = messages[draftIndex].orderDraft;
      await handleConfirmOrder(targetDraft, draftIndex);
      return;
    }

    const userMessage: Message = { role: 'user', content: userInput };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Server error: ${response.status}`);
      }

      const data = await response.json();
      if (data.message) {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: data.message,
          products: data.products || [],
          orderDraft: data.orderDraft || null,
        }]);
      } else {
        throw new Error('No message in response');
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I am having trouble connecting right now. Please try again later.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5, x: 20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="relative group"
      >
        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-white text-black text-[10px] font-bold px-2 py-1 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-neutral-100">
          Ask AI Assistant
        </div>
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full shadow-2xl h-10 w-10 md:h-12 md:w-12 bg-primary hover:bg-primary/95 text-primary-foreground border-2 border-white transition-all flex items-center justify-center p-0"
          aria-label="Open AI chat"
        >
          <Bot className="h-7 w-7 md:h-8 md:w-8" />
        </Button>
      </motion.div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 md:bottom-6 right-3 md:right-6 z-[60] w-[94vw] sm:w-[440px] max-w-[460px] h-[620px] max-h-[82vh] bg-background border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-primary text-primary-foreground flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Bot className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Swapnobaz AI</h3>
                  <p className="text-[10px] text-primary-foreground/70">Always active for you</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 text-primary-foreground hover:bg-white/10"
              >
                <X className="size-5" />
              </Button>
            </div>

            {/* Chat Content */}
            <div className="flex-1 overflow-hidden bg-muted/30">
              <div
                className="h-full overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent"
                ref={scrollRef}
              >
                <div className="space-y-4">
                  {messages.map((msg, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "flex gap-2.5",
                        msg.products && msg.products.length > 0 ? "w-full max-w-[96%]" : "max-w-[85%]",
                        msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                      )}
                    >
                      <div className={cn(
                        "size-8 rounded-full flex items-center justify-center shrink-0 border",
                        msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-background text-foreground"
                      )}>
                        {msg.role === 'user' ? <User className="size-4" /> : <Bot className="size-4" />}
                      </div>
                      <div className={cn(
                        "p-3 rounded-2xl text-sm shadow-sm whitespace-pre-line flex flex-col gap-2 min-w-0 w-full",
                        msg.role === 'user'
                          ? "bg-primary text-primary-foreground rounded-tr-none"
                          : "bg-background text-foreground rounded-tl-none border"
                      )}>
                        <div>
                          {msg.role === 'user'
                            ? msg.content
                            : renderMessageContent(msg.content, msg.products)}
                        </div>

                        {/* Interactive Order Draft / Confirmation Card */}
                        {msg.orderDraft && !msg.placedOrder && (
                          <div className="mt-3 p-3.5 bg-card text-card-foreground border-2 border-primary/30 rounded-xl flex flex-col gap-2.5 text-xs shadow-md">
                            <div className="flex items-center justify-between pb-2 border-b border-border/60">
                              <span className="font-bold flex items-center gap-1.5 text-primary">
                                <Package className="size-4" />
                                অর্ডার বিবরণী (Order Draft)
                              </span>
                              <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                                Cash on Delivery
                              </span>
                            </div>

                            {msg.orderDraft.product && (
                              <div className="flex items-center gap-2.5 py-1">
                                {msg.orderDraft.product.image ? (
                                  <img
                                    src={msg.orderDraft.product.image}
                                    alt={msg.orderDraft.product.name}
                                    className="size-12 rounded-lg object-cover border shrink-0"
                                  />
                                ) : null}
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-xs line-clamp-1">{msg.orderDraft.product.name}</p>
                                  <p className="text-muted-foreground text-[11px]">
                                    পরিমাণ: {msg.orderDraft.quantity || 1}
                                    {msg.orderDraft.size && ` | সাইজ: ${msg.orderDraft.size}`}
                                    {msg.orderDraft.color && ` | কালার: ${msg.orderDraft.color}`}
                                  </p>
                                  <p className="font-bold text-primary text-xs">
                                    ৳{msg.orderDraft.product.price}
                                  </p>
                                </div>
                              </div>
                            )}

                            <div className="space-y-1 py-1.5 px-2.5 bg-muted/40 rounded-lg text-[11px]">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">গ্রাহকের নাম:</span>
                                <span className="font-semibold">{msg.orderDraft.fullName}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">মোবাইল:</span>
                                <span className="font-semibold">{msg.orderDraft.phone}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">ঠিকানা:</span>
                                <span className="font-semibold text-right max-w-[65%] line-clamp-2">
                                  {msg.orderDraft.street}, {msg.orderDraft.city}
                                </span>
                              </div>
                              <div className="flex justify-between pt-1 border-t border-border/40">
                                <span className="text-muted-foreground">ডেলিভারি চার্জ:</span>
                                <span>৳{msg.orderDraft.deliveryCharge}</span>
                              </div>
                              <div className="flex justify-between pt-0.5 font-bold text-foreground">
                                <span>সর্বমোট প্রদেয়:</span>
                                <span className="text-primary text-xs">৳{msg.orderDraft.totalAmount}</span>
                              </div>
                            </div>

                            <Button
                              onClick={() => handleConfirmOrder(msg.orderDraft, index)}
                              disabled={orderingIndex === index}
                              className="w-full mt-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 shadow-md"
                            >
                              {orderingIndex === index ? (
                                <>
                                  <Loader2 className="size-3.5 animate-spin" />
                                  অর্ডার সম্পন্ন হচ্ছে...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="size-3.5" />
                                  অর্ডার নিশ্চিত করুন (Confirm Order)
                                </>
                              )}
                            </Button>
                          </div>
                        )}

                        {/* Placed Order Success Badge */}
                        {msg.placedOrder && (
                          <div className="mt-3 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl flex flex-col gap-2 text-xs text-foreground">
                            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
                              <CheckCircle className="size-4 shrink-0" />
                              <span>অর্ডার সম্পন্ন হয়েছে! (Order Placed)</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground">অর্ডার আইডি:</span>
                              <span className="font-mono font-bold text-primary">#{msg.placedOrder.shortId}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground">মোট টাকা:</span>
                              <span className="font-bold">৳{msg.placedOrder.totalAmount} (ক্যাশ অন ডেলিভারি)</span>
                            </div>
                            <div className="flex gap-2 mt-1">
                              <Link
                                href={`/track-order?id=${msg.placedOrder.shortId}`}
                                className="flex-1 text-center py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-[11px] transition-colors"
                                onClick={() => setIsOpen(false)}
                              >
                                ট্র্যাক করুন
                              </Link>
                              <Link
                                href="/dashboard"
                                className="flex-1 text-center py-1.5 px-2 bg-muted hover:bg-muted/80 text-foreground border rounded-lg font-medium text-[11px] transition-colors"
                                onClick={() => setIsOpen(false)}
                              >
                                ড্যাশবোর্ড
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3 max-w-[85%]">
                      <div className="size-8 rounded-full flex items-center justify-center bg-background border text-foreground">
                        <Bot className="size-4" />
                      </div>
                      <div className="bg-background border p-3 rounded-2xl rounded-tl-none">
                        <Loader2 className="size-4 animate-spin text-primary" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Input Area */}
            <div className="p-4 border-t bg-background">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Ask anything..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-1 bg-muted/50 border-none rounded-full px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={isLoading || !input.trim()}
                  className="rounded-full h-10 w-10 shrink-0 shadow-lg shadow-primary/20"
                >
                  <Send className="size-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

