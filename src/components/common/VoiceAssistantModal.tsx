import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  CornerDownLeft,
  User,
  Printer,
  Download,
  ChevronLeft,
  Phone,
  Layers,
} from 'lucide-react';
import { VoiceService, VoiceCommandResult } from '../../services/voiceService';
import { StorageService } from '../../services/storageService';
import { Customer } from '../../types';
import { formatCurrency, toPersianDigits } from '../../utils/jalali';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteCommand: (result: VoiceCommandResult) => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  onExecuteCommand,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [commandResult, setCommandResult] = useState<VoiceCommandResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [manualText, setManualText] = useState('');

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  // Initialize and start listening on open
  useEffect(() => {
    if (!isOpen) {
      stopListening();
      setTranscript('');
      setInterimTranscript('');
      setErrorMsg('');
      setCommandResult(null);
      setIsExecuting(false);
      setManualText('');
      return;
    }

    startListening();

    return () => {
      stopListening();
    };
  }, [isOpen]);

  const startListening = () => {
    setErrorMsg('');
    setTranscript('');
    setInterimTranscript('');
    setCommandResult(null);
    setIsExecuting(false);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (isIOS) {
        setErrorMsg('مرورگرهای آیفون (سافاری / کروم) به دلیل محدودیت‌های سیستم‌عامل iOS از تشخیص صوتی مستقیم پشتیبانی نمی‌کنند. 💡 نکته: می‌توانید روی دکمه میکروفون روی کیبورد آیفون بزنید تا صدای شما به متن تبدیل شود یا در کادر زیر دستور خود را بنویسید.');
      } else {
        setErrorMsg('قابلیت تشخیص صدا در این مرورگر پشتیبانی نمی‌شود. می‌توانید دستور خود را در کادر زیر تایپ نمایید.');
      }
      setIsListening(false);
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'fa-IR';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (interim) {
          setInterimTranscript(interim);
        }

        if (final) {
          setTranscript(final);
          setInterimTranscript('');
          handleProcessSpokenText(final);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setErrorMsg('دسترسی به میکروفون غیرفعال است. لطفاً در بالای مرورگر دسترسی به میکروفون را مجاز (Allow) فرمایید.');
        } else if (event.error === 'no-speech') {
          setErrorMsg('صدایی شنیده نشد. جهت تلاش مجدد، روی میکروفون بزنید.');
        } else {
          setErrorMsg('خطا در دریافت صدا. لطفاً مجدداً امتحان کنید.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to initialize speech recognition', err);
      setIsListening(false);
      setErrorMsg('امکان راه‌اندازی میکروفون وجود ندارد.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setIsListening(false);
  };

  const handleProcessSpokenText = (textToProcess: string) => {
    stopListening();

    const result = VoiceService.parseVoiceCommand(textToProcess);
    setCommandResult(result);

    // If it's a direct successful action (not multiple choices)
    if (result.success && result.action !== 'MULTIPLE_MATCHES') {
      setIsExecuting(true);
      timerRef.current = setTimeout(() => {
        onExecuteCommand(result);
        onClose();
      }, 700);
    }
  };

  const handleSelectCandidate = (customer: Customer) => {
    if (!commandResult) return;
    const subIntent = commandResult.subIntent || 'open';
    let finalResult: VoiceCommandResult;

    if (subIntent === 'print') {
      finalResult = {
        rawText: commandResult.rawText,
        action: 'PRINT_STATEMENT',
        subIntent: 'print',
        customerId: customer.id,
        customer,
        feedbackMessage: `در حال باز کردن پیش‌نمایش چاپ حساب «${customer.name}»...`,
        success: true,
      };
    } else if (subIntent === 'download') {
      finalResult = {
        rawText: commandResult.rawText,
        action: 'DOWNLOAD_IMAGE_STATEMENT',
        subIntent: 'download',
        customerId: customer.id,
        customer,
        feedbackMessage: `در حال دریافت خروجی عکس حساب «${customer.name}»...`,
        success: true,
      };
    } else {
      finalResult = {
        rawText: commandResult.rawText,
        action: 'OPEN_CUSTOMER_DOSSIER',
        subIntent: 'open',
        targetTab: 'customers',
        customerId: customer.id,
        customer,
        feedbackMessage: `در حال باز کردن پرونده حساب «${customer.name}»...`,
        success: true,
      };
    }

    setCommandResult(finalResult);
    setIsExecuting(true);
    timerRef.current = setTimeout(() => {
      onExecuteCommand(finalResult);
      onClose();
    }, 400);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    setTranscript(manualText);
    handleProcessSpokenText(manualText);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Minimal Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-black text-sm text-slate-900 dark:text-white">فرمان صوتی</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-center">
          {/* Main Mic Pulse */}
          <div className="py-2 flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center mb-4">
              {isListening && (
                <>
                  <div className="absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-blue-500/15 animate-ping" />
                  <div className="absolute w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-blue-600/25 animate-pulse" />
                </>
              )}

              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`relative z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg ${
                  isListening
                    ? 'bg-rose-600 text-white ring-4 ring-rose-300 dark:ring-rose-900/60 scale-105'
                    : isExecuting
                    ? 'bg-emerald-600 text-white ring-4 ring-emerald-300 dark:ring-emerald-900/60'
                    : 'bg-blue-600 hover:bg-blue-700 text-white ring-4 ring-blue-100 dark:ring-blue-950'
                }`}
                title={isListening ? 'توقف' : 'شروع ضبط'}
              >
                {isListening ? (
                  <Mic className="w-8 h-8 animate-bounce" />
                ) : isExecuting ? (
                  <CheckCircle2 className="w-8 h-8 animate-in zoom-in" />
                ) : (
                  <Mic className="w-8 h-8" />
                )}
              </button>
            </div>

            {/* Spoken Text Display */}
            <div className="min-h-[44px] flex items-center justify-center">
              {transcript || interimTranscript ? (
                <div className="p-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-100 font-black">
                  «{transcript || interimTranscript}»
                </div>
              ) : (
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                  {isListening ? 'در حال شنیدن... صحبت فرمایید' : 'برای صحبت، روی میکروفون بزنید'}
                </span>
              )}
            </div>
          </div>

          {/* Feedback or Error State */}
          {commandResult && commandResult.action !== 'MULTIPLE_MATCHES' && (
            <div
              className={`p-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 ${
                commandResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800'
              }`}
            >
              {commandResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span>{commandResult.feedbackMessage}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800 text-xs font-bold flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Multiple Candidates Selection View */}
          {commandResult &&
            commandResult.action === 'MULTIPLE_MATCHES' &&
            commandResult.candidates &&
            commandResult.candidates.length > 0 && (
              <div className="text-right space-y-2 pt-1 animate-in fade-in">
                <div className="text-xs font-black text-slate-700 dark:text-slate-300 pb-1 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span>چند مورد یافت شد؛ انتخاب کنید:</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                    {toPersianDigits(commandResult.candidates.length)} مشتری
                  </span>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto p-0.5">
                  {commandResult.candidates.map((cust) => {
                    const summary = StorageService.getCustomerAccountSummary(cust.id);
                    return (
                      <button
                        key={cust.id}
                        type="button"
                        onClick={() => handleSelectCandidate(cust)}
                        className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/60 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 transition flex items-center justify-between text-right cursor-pointer group shadow-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 group-hover:bg-blue-600 group-hover:text-white transition">
                            {commandResult.subIntent === 'print' ? (
                              <Printer className="w-4 h-4" />
                            ) : commandResult.subIntent === 'download' ? (
                              <Download className="w-4 h-4" />
                            ) : (
                              <User className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                              {cust.name}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                              {cust.code && <span>کد: {toPersianDigits(cust.code)}</span>}
                              {cust.phone && <span>تلفن: {toPersianDigits(cust.phone)}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                              summary.status === 'debit'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                : summary.status === 'credit'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {summary.status === 'debit'
                              ? `${formatCurrency(summary.balance)} بدهکار`
                              : summary.status === 'credit'
                              ? `${formatCurrency(Math.abs(summary.balance))} بستانکار`
                              : 'تسویه'}
                          </span>
                          <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:-translate-x-0.5 transition" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          {/* Minimal text input fallback */}
          <form onSubmit={handleManualSubmit} className="pt-2">
            <div className="relative flex items-center">
              <input
                type="text"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="یا تایپ کنید (مثال: پرینت حساب حسینی، دانلود حساب آذرخش)..."
                className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition"
              />
              <button
                type="submit"
                disabled={!manualText.trim()}
                className="absolute left-1 top-1 bottom-1 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold transition flex items-center justify-center cursor-pointer"
              >
                <CornerDownLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
