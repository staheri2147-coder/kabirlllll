import React, { useState, useEffect } from "react";
import { StorageService } from "../../services/storageService";
import { AuditLog, SystemSettings, User, Permission, Role } from "../../types";
import { formatJalaliDate, formatJalaliDateTime, toPersianDigits } from "../../utils/jalali";
import { exportToExcel } from "../../utils/exportExcel";
import { formatAuditNarrative, getAuditFieldDiffs, ENTITY_LABELS } from "../../utils/formatAuditLog";
import { DatabaseSetupModal } from "../DatabaseSetupModal";
import {
  ShieldAlert,
  Settings,
  Database,
  Download,
  Upload,
  RotateCcw,
  Search,
  CheckCircle2,
  AlertCircle,
  Building,
  Save,
  Image as ImageIcon,
  Trash2,
  Users,
  UserPlus,
  Edit2,
  Key,
  Eye,
  EyeOff,
  Bell,
  ShieldCheck,
  FileText,
  Receipt,
  Truck,
  Server,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronUp,
  History,
  UserCheck,
  UserX,
  HelpCircle,
  Info,
  Smartphone,
  Laptop,
} from "lucide-react";
import { AuditLogDetailModal } from "./AuditLogDetailModal";

interface SettingsAuditManagerProps {
  initialSubTab?: "company" | "users" | "backup" | "audit";
}

export const SettingsAuditManager: React.FC<SettingsAuditManagerProps> = ({ initialSubTab = "company" }) => {
  const [activeTab, setActiveTab] = useState<"company" | "users" | "backup" | "audit">(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Help Modal State
  const [helpTopic, setHelpTopic] = useState<"sql" | "sync" | "json" | "reset" | "reminder" | "user_code" | null>(null);

  // Restore & Backup Format State
  const [restoreFileFormat, setRestoreFileFormat] = useState<"sql" | "json" | null>(null);
  const [restoreFileContent, setRestoreFileContent] = useState<string>("");
  const [restoreFileName, setRestoreFileName] = useState<string>("");
  const [isProcessingRestore, setIsProcessingRestore] = useState<boolean>(false);

  // Audit Logs State
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchLogQuery, setSearchLogQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [userFilter, setUserFilter] = useState("ALL");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [selectedLogForDetail, setSelectedLogForDetail] = useState<AuditLog | null>(null);

  // Settings State
  const [settings, setSettings] = useState<SystemSettings>(StorageService.getSettings());
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  // Users & Permissions State
  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [activeUser, setActiveUser] = useState<User>(StorageService.getActiveUser());
  const [searchUserQuery, setSearchUserQuery] = useState("");

  // User Edit/Create Modal State
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [userModalError, setUserModalError] = useState("");
  const [userModalSuccess, setUserModalSuccess] = useState("");
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [isSubmittingSettings, setIsSubmittingSettings] = useState(false);

  // Backup Reminder & Status State
  const [backupStatus, setBackupStatus] = useState(StorageService.checkBackupReminder());
  const [restorePreviewData, setRestorePreviewData] = useState<any | null>(null);
  const [restoreJsonString, setRestoreJsonString] = useState<string>("");
  const [restoreMsg, setRestoreMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Host Database status
  const [hostDbStatus, setHostDbStatus] = useState<{ checked: boolean; available: boolean; info?: any }>({
    checked: false,
    available: false,
  });
  const [isSyncingHost, setIsSyncingHost] = useState(false);
  const [hostSyncMsg, setHostSyncMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isDbSetupOpen, setIsDbSetupOpen] = useState(false);

  useEffect(() => {
    loadAllData();
    const handleDbSynced = () => {
      loadAllData();
    };
    window.addEventListener("polyethylene-db-synced", handleDbSynced);
    window.addEventListener("polyethylene-settings-changed", handleDbSynced);
    return () => {
      window.removeEventListener("polyethylene-db-synced", handleDbSynced);
      window.removeEventListener("polyethylene-settings-changed", handleDbSynced);
    };
  }, []);

  const loadAllData = () => {
    setLogs(StorageService.getAuditLogs());
    setSettings(StorageService.getSettings());
    setUsers(StorageService.getUsers());
    setPermissions(StorageService.getPermissions());
    setRoles(StorageService.getRoles());
    setActiveUser(StorageService.getActiveUser());
    setBackupStatus(StorageService.checkBackupReminder());

    // Check if running on a host with api.php
    StorageService.checkHostApi().then((res) => {
      setHostDbStatus({ checked: true, available: res.available, info: res.info });
    });
  };

  // ----------------------------------------------------
  // COMPANY SETTINGS HANDLERS
  // ----------------------------------------------------
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("حجم فایل لوگو نباید بیشتر از ۲ مگابایت باشد.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      setSettings((prev) => ({
        ...prev,
        logo_url: base64,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setSettings((prev) => ({
      ...prev,
      logo_url: "",
    }));
  };

  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("حجم فایل مهر و امضا نباید بیشتر از ۲ مگابایت باشد.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      setSettings((prev) => ({
        ...prev,
        stamp_signature_url: base64,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveStamp = () => {
    setSettings((prev) => ({
      ...prev,
      stamp_signature_url: "",
    }));
  };

  const handleLoginBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert("حجم فایل پس‌زمینه نباید بیشتر از ۳ مگابایت باشد.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      setSettings((prev) => ({
        ...prev,
        login_background_url: base64,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLoginBg = () => {
    setSettings((prev) => ({
      ...prev,
      login_background_url: "",
    }));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingSettings) return;
    setIsSubmittingSettings(true);
    try {
      const companyClean = (settings.business_name || settings.company_name || "").trim();
      const payload: SystemSettings = {
        ...settings,
        business_name: companyClean,
        company_name: companyClean,
      };
      setSettings(payload);

      // Fast instant save directly to MySQL system_settings table
      const res = await StorageService.saveSettingsToHost(payload);
      StorageService.updateSettings(payload);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("polyethylene-db-synced"));
        window.dispatchEvent(new CustomEvent("polyethylene-settings-changed", { detail: payload }));
      }
      setSaveSuccessMsg(res.message || "تنظیمات عمومی و مشخصات شرکت با موفقیت در جدول system_settings دیتابیس ثبت شد.");
      setTimeout(() => setSaveSuccessMsg(""), 5000);
      loadAllData();
    } catch (err: any) {
      alert("خطا در ذخیره تنظیمات: " + (err?.message || "نامشخص"));
    } finally {
      setIsSubmittingSettings(false);
    }
  };

  // ----------------------------------------------------
  // USER MANAGEMENT HANDLERS
  // ----------------------------------------------------
  const handleOpenCreateUser = () => {
    setIsSubmittingUser(false);
    setEditingUser({
      id: "",
      name: "",
      username: "",
      password: "",
      role_id: "role-sales",
      role_name: "", // Defaults to blank so user types custom role by default
      is_admin: false,
      is_active: true,
      permissions: ["orders.view", "customers.view", "orders.create"],
    });
    setShowPassword(true);
    setUserModalError("");
    setUserModalSuccess("");
    setShowUserModal(true);
  };

  const handleOpenEditUser = (u: User) => {
    setIsSubmittingUser(false);
    setEditingUser({
      ...u,
      permissions: u.permissions ? [...u.permissions] : [],
    });
    setShowPassword(false);
    setUserModalError("");
    setUserModalSuccess("");
    setShowUserModal(true);
  };

  const handleTogglePermission = (permKey: string) => {
    if (!editingUser) return;
    const currentPerms = editingUser.permissions ? [...editingUser.permissions] : [];
    let nextPerms: string[];
    if (currentPerms.includes(permKey)) {
      nextPerms = currentPerms.filter((k) => k !== permKey);
    } else {
      nextPerms = [...currentPerms, permKey];
    }
    setEditingUser({
      ...editingUser,
      is_admin: false,
      permissions: nextPerms,
    });
  };

  const effectivePermissions = permissions && permissions.length > 0 ? permissions : StorageService.getPermissions();

  const handleSelectAllCategoryPermissions = (category: string) => {
    if (!editingUser) return;
    const categoryPerms = effectivePermissions.filter((p) => p.category === category).map((p) => p.key);
    const currentPerms = new Set(editingUser.permissions || []);
    const allSelected = categoryPerms.every((k) => currentPerms.has(k));

    if (allSelected) {
      categoryPerms.forEach((k) => currentPerms.delete(k));
    } else {
      categoryPerms.forEach((k) => currentPerms.add(k));
    }

    setEditingUser({
      ...editingUser,
      is_admin: false,
      permissions: Array.from(currentPerms),
    });
  };

  const handleSelectAllPermissions = () => {
    if (!editingUser) return;
    setEditingUser({
      ...editingUser,
      permissions: effectivePermissions.map((p) => p.key),
    });
  };

  const handleDeselectAllPermissions = () => {
    if (!editingUser) return;
    setEditingUser({
      ...editingUser,
      is_admin: false,
      permissions: [],
    });
  };

  const handleSaveUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingUser) return;
    if (!editingUser) return;

    if (!editingUser.name?.trim()) {
      setUserModalError("نام و نام خانوادگی کاربر الزامی است.");
      return;
    }
    if (!editingUser.username?.trim()) {
      setUserModalError("نام کاربری الزامی است.");
      return;
    }
    if (!editingUser.id && !editingUser.password?.trim()) {
      setUserModalError("کلمه عبور برای کاربر جدید الزامی است.");
      return;
    }

    // Check duplicate username
    const duplicate = users.find(
      (u) => u.username.toLowerCase() === editingUser.username?.trim().toLowerCase() && u.id !== editingUser.id
    );
    if (duplicate) {
      setUserModalError("نام کاربری «" + editingUser.username + "» قبلاً توسط کاربر دیگری ثبت شده است.");
      return;
    }

    setIsSubmittingUser(true);
    setUserModalError("");

    try {
      const allPermKeys = effectivePermissions.map((p) => p.key);
      const userPerms = editingUser.permissions || [];
      const hasAllPerms = allPermKeys.length > 0 && allPermKeys.every((k) => userPerms.includes(k));
      const isActuallyAdmin = Boolean(hasAllPerms);

      const selectedRole = roles.find((r) => r.id === editingUser.role_id || r.name === editingUser.role_name);
      const finalPerms = userPerms;
      const finalRoleName = editingUser.role_name?.trim() || (isActuallyAdmin ? "مدیر ارشد سیستم" : selectedRole?.name || "کارشناس");
      const finalRoleId = isActuallyAdmin ? "role-admin" : (editingUser.role_id === 'role-admin' ? 'role-custom' : (editingUser.role_id || 'role-sales'));

      const saved = StorageService.saveUser({
        ...editingUser,
        is_admin: isActuallyAdmin,
        role_id: finalRoleId,
        name: editingUser.name.trim(),
        username: editingUser.username.trim(),
        role_name: finalRoleName,
        permissions: finalPerms,
      } as User);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("polyethylene-db-synced"));
      }
      StorageService.pushToHost().catch(() => {});

      setUserModalSuccess("کاربر «" + saved.name + "» با موفقیت ذخیره شد.");
      setTimeout(() => {
        setIsSubmittingUser(false);
        setShowUserModal(false);
        loadAllData();
      }, 700);
    } catch (err: any) {
      setIsSubmittingUser(false);
      setUserModalError("خطا در ذخیره کاربر: " + (err?.message || "نامشخص"));
    }
  };

  const handleToggleUserActive = (targetUser: User) => {
    if (targetUser.id === activeUser.id) {
      alert("شما نمی‌توانید حساب کاربری جاری که هم‌اکنون با آن وارد سیستم هستید را غیرفعال نمایید.");
      return;
    }

    const nextStatus = !targetUser.is_active;
    const actionLabel = nextStatus ? "فعال‌سازی" : "غیرفعال‌سازی";

    if (
      window.confirm(
        `آیا از ${actionLabel} حساب کاربری «${targetUser.name}» (${targetUser.username}) اطمینان دارید؟\n\nجهت حفظ یکپارچگی اطلاعات، هیچ‌یک از اسناد و سوابق قبلی این کاربر حذف نخواهد شد و صرفاً وضعیت دسترسی کاربر به سیستم تغییر می‌یابد.`
      )
    ) {
      const res = StorageService.setUserActive(targetUser.id, nextStatus);
      if (res.success) {
        setSaveSuccessMsg(res.message);
        setTimeout(() => setSaveSuccessMsg(""), 4000);
        loadAllData();
      } else {
        alert(res.message);
      }
    }
  };

  // ----------------------------------------------------
  // BACKUP & RESTORE HANDLERS
  // ----------------------------------------------------
  const handleSqlBackupDownload = async () => {
    try {
      await StorageService.downloadSqlBackup();
      setBackupStatus(StorageService.checkBackupReminder());
      setSaveSuccessMsg("فایل استاندارد SQL پایگاه‌داده MySQL (معیار اصلی) با موفقیت دریافت گردید و موعد بک‌آپ بروز شد.");
      setTimeout(() => setSaveSuccessMsg(""), 5000);
    } catch (err: any) {
      alert("خطا در تهیه بکاپ SQL: " + (err?.message || ""));
    }
  };

  const handleJsonBackupDownload = () => {
    const fullData = StorageService.exportFullBackup();
    StorageService.markBackupCompleted();
    setBackupStatus(StorageService.checkBackupReminder());

    const blob = new Blob([fullData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Polyethylene_Auxiliary_Backup_" + new Date().toISOString().split("T")[0] + ".json";
    a.click();
    URL.revokeObjectURL(url);

    setSaveSuccessMsg("فایل کمکی JSON با موفقیت دریافت شد (صرفاً آرشیو فرعی بدون تداخل در دیتابیس).");
    setTimeout(() => setSaveSuccessMsg(""), 5000);
  };

  const handleFileSelectForRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreMsg(null);
    setRestoreFileName(file.name);
    const isSql = file.name.toLowerCase().endsWith(".sql");
    const isJson = file.name.toLowerCase().endsWith(".json");

    if (!isSql && !isJson) {
      setRestoreMsg({
        type: "error",
        text: "فرمت فایل نامعتبر است. لطفاً فایل پایگاه‌داده با پسوند .sql یا .json انتخاب نمایید.",
      });
      setRestorePreviewData(null);
      setRestoreFileFormat(null);
      setRestoreFileContent("");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = (evt.target?.result as string) || "";
      setRestoreFileContent(content);

      if (isSql) {
        setRestoreFileFormat("sql");
        const insertMatches = content.match(/(?:INSERT|REPLACE)\s+INTO\s+[`"]?([a-zA-Z0-9_]+)[`"]?/gi) || [];
        const createMatches = content.match(/CREATE\s+TABLE\s+[`"]?([a-zA-Z0-9_]+)[`"]?/gi) || [];
        const custMatches = content.match(/(?:INSERT|REPLACE)\s+INTO\s+[`"]?customers[`"]?/gi) || [];
        const invMatches = content.match(/(?:INSERT|REPLACE)\s+INTO\s+[`"]?invoices[`"]?/gi) || [];
        const ordMatches = content.match(/(?:INSERT|REPLACE)\s+INTO\s+[`"]?orders[`"]?/gi) || [];

        // Preview extracted company name
        let detectedCompanyName = "";
        const nameMatch = /(?:INSERT|REPLACE)\s+INTO\s+[`"]?(?:settings|system_settings|company_settings)[`"]?[^;]*?VALUES\s*\(([\s\S]*?)\)/i.exec(content);
        if (nameMatch) {
          const valStr = nameMatch[1];
          const m = /'([^'\\]*(?:\\.[^'\\]*)*)'|"([^"\\]*(?:\\.[^"\\]*)*)"/g;
          let match;
          while ((match = m.exec(valStr)) !== null) {
            const val = (match[1] || match[2] || "").trim();
            if (val.includes("شرکت") || val.includes("تولیدی") || val.includes("البرز") || val.includes("لوله")) {
              detectedCompanyName = val;
              break;
            }
          }
        }
        if (!detectedCompanyName) {
          const headerMatch = /--\s*(?:پایگاه\s*داده\s*رسمی|نام\s*شرکت|Company|Official\s*Database)\s*:\s*([^\r\n]+)/i.exec(content);
          if (headerMatch) detectedCompanyName = headerMatch[1].trim();
        }

        setRestorePreviewData({
          type: "sql",
          title: "فایل اسکریپت پایگاه‌داده MySQL (.sql) - معیار اصلی سیستم",
          fileName: file.name,
          fileSize: (file.size / 1024).toFixed(1) + " کیلوبایت",
          tableCount: createMatches.length || 25,
          statementCount: insertMatches.length,
          customersCount: custMatches.length,
          ordersCount: ordMatches.length,
          invoicesCount: invMatches.length,
          companyName: detectedCompanyName || "تنظیمات اختصاصی سیستم",
          exported_at: "محتویات جداول استاندارد MySQL",
        });
      } else {
        setRestoreFileFormat("json");
        try {
          const parsed = JSON.parse(content);
          const data = parsed.data || parsed;
          if (!data || typeof data !== "object") {
            setRestoreMsg({ type: "error", text: "فایل نامعتبر است: بخش داده‌های سیستم (data) یافت نشد." });
            setRestorePreviewData(null);
            return;
          }
          const rawSett = data.settings || data.system_settings || data.company_settings || parsed.settings || null;
          const detectedName = rawSett?.company_name || rawSett?.business_name || data.company_name || data.business_name || "";

          setRestorePreviewData({
            type: "json",
            title: "فایل کمکی JSON (آرشیو سبک)",
            fileName: file.name,
            fileSize: (file.size / 1024).toFixed(1) + " کیلوبایت",
            version: parsed.version || "1.0",
            exported_at: parsed.exported_at ? String(parsed.exported_at) : "ثبت نشده",
            customersCount: data.customers?.length || 0,
            ordersCount: data.orders?.length || 0,
            invoicesCount: data.invoices?.length || 0,
            productionLogsCount: data.production_logs?.length || 0,
            usersCount: data.users?.length || 0,
            companyName: detectedName || "تنظیمات اختصاصی سیستم",
          });
        } catch (err: any) {
          setRestoreMsg({ type: "error", text: "فایل JSON نامعتبر است: " + (err?.message || "") });
          setRestorePreviewData(null);
        }
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadRepairedSql = () => {
    if (!restoreFileContent) return;
    const repaired = StorageService.repairSqlForPhpMyAdmin(restoreFileContent);
    const blob = new Blob([repaired], { type: "application/sql;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AlborzPipe_Standard_For_phpMyAdmin_${Date.now()}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleConfirmRestore = async () => {
    if (!restoreFileContent || !restoreFileFormat) return;
    if (
      !window.confirm(
        "هشدار جایگزینی اطلاعات:\nبازیابی این فایل کلیه اطلاعات جاری سیستم و دیتابیس MySQL هاست را طبق این فایل بازنویسی خواهد کرد.\n\nآیا مایل به اجرای بازیابی هستید؟"
      )
    ) {
      return;
    }

    setIsProcessingRestore(true);
    setRestoreMsg(null);

    try {
      if (restoreFileFormat === "sql") {
        const res = await StorageService.restoreSqlBackup(restoreFileContent);
        if (res.success) {
          setRestoreMsg({ type: "success", text: res.message });
          loadAllData();
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("polyethylene-db-synced"));
            window.dispatchEvent(new CustomEvent("polyethylene-settings-changed"));
          }
          alert(res.message);
          window.location.reload();
        } else {
          setRestoreMsg({ type: "error", text: res.message });
          alert("خطا در بازیابی پایگاه‌داده:\n" + res.message);
        }
      } else {
        const res = await StorageService.restoreFullBackup(restoreFileContent);
        if (res.success) {
          setRestoreMsg({ type: "success", text: res.message });
          loadAllData();
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("polyethylene-db-synced"));
            window.dispatchEvent(new CustomEvent("polyethylene-settings-changed"));
          }
          alert(res.message);
          window.location.reload();
        } else {
          setRestoreMsg({ type: "error", text: res.message });
          alert("خطا در بازیابی نسخه پشتیبان:\n" + res.message);
        }
      }
    } catch (err: any) {
      setRestoreMsg({ type: "error", text: "خطا در عملیات بازیابی: " + (err?.message || "") });
    } finally {
      setIsProcessingRestore(false);
    }
  };

  const handleSyncFromHost = async () => {
    setIsSyncingHost(true);
    setHostSyncMsg(null);
    const res = await StorageService.pullFromHost();
    setIsSyncingHost(false);
    if (res.success) {
      setHostSyncMsg({ type: "success", text: res.message || "اطلاعات با موفقیت و مستقیماً از MySQL هاست دریافت شد." });
      loadAllData();
    } else {
      setHostSyncMsg({ type: "error", text: res.message || "خطا در ارتباط با پایگاه‌داده هاست." });
    }
  };

  const handlePushToHost = async () => {
    setIsSyncingHost(true);
    setHostSyncMsg(null);
    const res = await StorageService.pushToHost();
    setIsSyncingHost(false);
    if (res.success) {
      setHostSyncMsg({ type: "success", text: "کلیه داده‌های جاری مستقیماً در پایگاه‌داده MySQL هاست تثبیت گردید." });
      StorageService.checkHostApi().then((r) => {
        setHostDbStatus({ checked: true, available: r.available, info: r.info });
      });
    } else {
      setHostSyncMsg({ type: "error", text: res.message });
    }
  };

  const handleSaveReminderSettings = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.updateSettings(settings);
    setBackupStatus(StorageService.checkBackupReminder());
    setSaveSuccessMsg("تنظیمات یادآور خودکار پشتیبان‌گیری با موفقیت ذخیره گردید.");
    setTimeout(() => setSaveSuccessMsg(""), 4000);
  };

  const handleResetToDefaultData = async () => {
    const confirmed = window.confirm(
      "هشدار بسیار مهم پاک‌سازی کامل (صفر کردن داده‌ها):\n\nبا تایید این عملیات، کلیه اطلاعات ثبت‌شده شامل مشتریان، پیش‌فاکتورها، فاکتورهای فروش، حواله‌های خروج، گزارشات تولید، پرسنل، چک‌ها، اسناد مالی و لاگ‌ها به صورت کامل و صفر پاک‌سازی خواهند شد و هیچ داده نمونه‌ای باقی نمی‌ماند.\n\nهمچنین دیتابیس MySQL هاست نیز کاملاً پاک و آماده ورود اطلاعات واقعی می‌گردد.\n\nآیا از پاک‌سازی کامل و صفر کردن داده‌ها اطمینان قطعی دارید؟"
    );
    if (!confirmed) return;

    const res = await StorageService.resetToDefaultData();
    alert(res.message);
    window.location.reload();
  };

  // ----------------------------------------------------
  // AUDIT LOGS EXPORT & FILTERING
  // ----------------------------------------------------
  const handleExportAuditExcel = () => {
    const data = filteredLogs.map((l, idx) => {
      const matchedUser = users.find((u) => u.id === l.user_id || (l.user_code && u.user_code === l.user_code));
      return {
        ردیف: idx + 1,
        شرح_کامل_رویداد: formatAuditNarrative(l),
        تاریخ_و_زمان: formatJalaliDateTime(l.created_at),
        کد_یکتا_کاربر: matchedUser?.user_code || l.user_code || "-",
        کاربر: matchedUser?.name || l.user_name || "کاربر سیستم",
        سمت_کاربر: l.user_role || "-",
        نوع_عملیات: l.action,
        بخش_سیستم: (ENTITY_LABELS as any)[l.entity_type?.toUpperCase()] || l.entity_type,
        شماره_سند: l.document_number || l.entity_id || "-",
        شناسه_سیستمی: l.id,
      };
    });

    exportToExcel({
      fileName: "گزارش_جامع_لاگ_و_سوابق_امنیتی_سامانه",
      sheetName: "AuditLogs",
      data,
    });
  };

  const filteredLogs = logs.filter((l) => {
    // 1. Entity Type filter
    if (entityFilter !== "ALL" && (l.entity_type || "").toUpperCase() !== entityFilter.toUpperCase()) {
      return false;
    }

    // 2. Action Type filter
    if (actionFilter !== "ALL") {
      const act = (l.action_type || "").toLowerCase();
      const aName = (l.action || "").toLowerCase();
      if (actionFilter === "create" && act !== "create" && !aName.includes("ثبت") && !aName.includes("ایجاد") && !aName.includes("صدور")) return false;
      if (actionFilter === "update" && act !== "update" && !aName.includes("ویرایش") && !aName.includes("تغییر")) return false;
      if (actionFilter === "confirm" && act !== "confirm" && !aName.includes("تایید")) return false;
      if (actionFilter === "cancel" && act !== "cancel" && !aName.includes("لغو") && !aName.includes("ابطال")) return false;
      if (actionFilter === "delete" && act !== "delete" && !aName.includes("حذف")) return false;
      if (actionFilter === "print" && act !== "print" && !aName.includes("چاپ")) return false;
      if (actionFilter === "auth" && l.entity_type !== "AUTH") return false;
    }

    // 3. User filter (robust lookup by user_id and immutable user_code)
    if (userFilter !== "ALL") {
      const selectedUser = users.find((u) => u.id === userFilter);
      const matchesId = l.user_id === userFilter;
      const matchesCode = Boolean(selectedUser?.user_code && l.user_code === selectedUser.user_code);
      const matchesLegacyName = Boolean(selectedUser?.name && l.user_name === selectedUser.name);
      if (!matchesId && !matchesCode && !matchesLegacyName) {
        return false;
      }
    }

    // 4. Text query
    if (!searchLogQuery.trim()) return true;
    const q = searchLogQuery.toLowerCase().trim();
    const narrative = formatAuditNarrative(l).toLowerCase();
    const matchedUser = users.find((u) => u.id === l.user_id || (l.user_code && u.user_code === l.user_code));
    const userName = (matchedUser?.name || l.user_name || "").toLowerCase();
    const userCode = (matchedUser?.user_code || l.user_code || "").toLowerCase();
    return (
      userName.includes(q) ||
      userCode.includes(q) ||
      (l.user_role && l.user_role.toLowerCase().includes(q)) ||
      (l.action && l.action.toLowerCase().includes(q)) ||
      (l.entity_type && l.entity_type.toLowerCase().includes(q)) ||
      (l.document_number && l.document_number.toLowerCase().includes(q)) ||
      (l.entity_id && l.entity_id.toLowerCase().includes(q)) ||
      narrative.includes(q)
    );
  });

  const filteredUsers = (users || []).filter((u) => {
    if (!u) return false;
    const q = (searchUserQuery || "").toLowerCase();
    return (
      (u.name || "").toLowerCase().includes(q) ||
      (u.username || "").toLowerCase().includes(q) ||
      (u.role_name || "").toLowerCase().includes(q)
    );
  });

  // Group permissions by category for the modal
  const permissionCategories: string[] = Array.from(
    new Set(effectivePermissions.map((p) => p?.category).filter(Boolean) as string[])
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" />
            <span>تنظیمات عمومی، کاربری و پشتیبان‌گیری</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            مدیریت مشخصات شرکت، شروط و متون پیش‌فرض اسناد، سطوح دسترسی دقیق کاربران و زمان‌بندی پشتیبان‌گیری
          </p>
        </div>

        {/* Backup Status Badge in Header */}
        {backupStatus.isEnabled && (
          <div
            className={"px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 shrink-0 " + (
              backupStatus.isOverdue
                ? "bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-800 dark:text-rose-300 animate-pulse"
                : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300"
            )}
          >
            <Bell className="w-4 h-4 shrink-0" />
            <span>
              {backupStatus.isOverdue
                ? "⚠️ یادآوری: " + toPersianDigits(backupStatus.daysSinceLastBackup) + " روز از آخرین بک‌آپ گذشته!"
                : "✅ پشتیبان‌گیری به‌روز (" + toPersianDigits(backupStatus.daysSinceLastBackup) + " روز پیش)"}
            </span>
          </div>
        )}
      </div>

      {/* Global Success Banner */}
      {saveSuccessMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveTab("company")}
          className={"px-4 py-3 border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap " + (
            activeTab === "company"
              ? "border-blue-600 text-blue-600 bg-blue-50/60 dark:bg-blue-950/40 font-black"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          )}
        >
          <Building className="w-4 h-4" />
          <span>تنظیمات عمومی و مشخصات شرکت</span>
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={"px-4 py-3 border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap " + (
            activeTab === "users"
              ? "border-blue-600 text-blue-600 bg-blue-50/60 dark:bg-blue-950/40 font-black"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          )}
        >
          <Users className="w-4 h-4" />
          <span>مدیریت کاربران و سطوح دسترسی ({toPersianDigits(users.length)})</span>
        </button>

        <button
          onClick={() => setActiveTab("backup")}
          className={"px-4 py-3 border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap " + (
            activeTab === "backup"
              ? "border-blue-600 text-blue-600 bg-blue-50/60 dark:bg-blue-950/40 font-black"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          )}
        >
          <Database className="w-4 h-4" />
          <span>پشتیبان‌گیری، بازیابی و یادآور</span>
        </button>

        {(StorageService.isAdmin() || StorageService.hasPermission('settings.audit')) && (
          <button
            onClick={() => setActiveTab("audit")}
            className={"px-4 py-3 border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap " + (
              activeTab === "audit"
                ? "border-blue-600 text-blue-600 bg-blue-50/60 dark:bg-blue-950/40 font-black"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>سوابق امنیتی و لاگ‌ها ({toPersianDigits(logs.length)})</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: COMPANY SETTINGS & DEFAULT DOCUMENT NOTES */}
      {/* ========================================================================= */}
      {activeTab === "company" && (
        <form onSubmit={handleSaveSettings} className="space-y-5">
          {/* Card 1: Official Company Specs */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Building className="w-5 h-5 text-blue-600" />
              <h2 className="font-bold text-slate-900 dark:text-white text-sm">
                مشخصات رسمی شرکت فروشنده (چاپ در سربرگ فاکتور، پیش‌فاکتور و اسناد تحویل)
              </h2>
            </div>

            {/* Logo, Stamp & Login Background Upload Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* 1. Official Logo */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 flex flex-col justify-between">
                <div>
                  <label className="block text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 mb-2">
                    <ImageIcon className="w-4 h-4 text-blue-600" />
                    <span>لوگوی رسمی شرکت (سربرگ اسناد)</span>
                  </label>

                  <div className="w-full h-24 bg-white dark:bg-slate-900 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center p-2 overflow-hidden relative shadow-xs mb-3">
                    {settings.logo_url ? (
                      <img
                        src={settings.logo_url}
                        alt="لوگوی شرکت"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="text-center text-slate-400">
                        <ImageIcon className="w-6 h-6 mx-auto mb-0.5 opacity-50" />
                        <span className="text-[10px] block font-semibold">بدون لوگو</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer transition shadow-xs text-xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>آپلود لوگو</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp, image/svg+xml"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>

                    {settings.logo_url && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 font-bold transition cursor-pointer text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    ابعاد افقی با پس‌زمینه شفاف (PNG) جهت چاپ در سربرگ فاکتورها. حداکثر ۲ مگابایت.
                  </p>
                </div>
              </div>

              {/* 2. Official Stamp & Signature */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 flex flex-col justify-between">
                <div>
                  <label className="block text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 mb-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>مهر و امضای رسمی کارخانه</span>
                  </label>

                  <div className="w-full h-24 bg-white dark:bg-slate-900 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center p-2 overflow-hidden relative shadow-xs mb-3">
                    {settings.stamp_signature_url ? (
                      <img
                        src={settings.stamp_signature_url}
                        alt="مهر و امضای شرکت"
                        className="max-h-full max-w-full object-contain mix-blend-multiply"
                      />
                    ) : (
                      <div className="text-center text-slate-400">
                        <ShieldCheck className="w-6 h-6 mx-auto mb-0.5 opacity-50" />
                        <span className="text-[10px] block font-semibold">بدون مهر و امضا</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer transition shadow-xs text-xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>آپلود مهر و امضا</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={handleStampUpload}
                        className="hidden"
                      />
                    </label>

                    {settings.stamp_signature_url && (
                      <button
                        type="button"
                        onClick={handleRemoveStamp}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 font-bold transition cursor-pointer text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    با تیک زدن گزینه «افزودن مهر و امضا» در فاکتورها، رسیدها و برگه مرخصی به طور خودکار درج می‌شود.
                  </p>
                </div>
              </div>

              {/* 3. Login Page Background */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 flex flex-col justify-between">
                <div>
                  <label className="block text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 mb-2">
                    <ImageIcon className="w-4 h-4 text-purple-600" />
                    <span>تصویر پس‌زمینه صفحه ورود (Login)</span>
                  </label>

                  <div className="w-full h-24 bg-white dark:bg-slate-900 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center p-1 overflow-hidden relative shadow-xs mb-3">
                    {settings.login_background_url ? (
                      <img
                        src={settings.login_background_url}
                        alt="پس‌زمینه صفحه ورود"
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="text-center text-slate-400">
                        <ImageIcon className="w-6 h-6 mx-auto mb-0.5 opacity-50" />
                        <span className="text-[10px] block font-semibold">طرح پیش‌فرض سیستم</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer transition shadow-xs text-xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>آپلود تصویر پس‌زمینه</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={handleLoginBgUpload}
                        className="hidden"
                      />
                    </label>

                    {settings.login_background_url && (
                      <button
                        type="button"
                        onClick={handleRemoveLoginBg}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 font-bold transition cursor-pointer text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    ابعاد پیشنهادی: <strong>۱۹۲۰×۱۰۸۰ پیکسل (نسبت ۱۶:۹)</strong>، حداکثر ۳ مگابایت (JPG/PNG/WebP).
                  </p>
                </div>
              </div>
            </div>

            {/* Input Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  نام کامل شرکت / کارخانه <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={settings.business_name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSettings((prev) => ({ ...prev, business_name: val, company_name: val }));
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white"
                  placeholder="مثال: شرکت تولیدی لوله پلی‌اتیلن البرز پایپ"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  توضیح و شعار زیر نام شرکت (یک‌خطی) <span className="text-blue-500">*</span>
                </label>
                <input
                  type="text"
                  value={settings.brand_subtitle || ""}
                  onChange={(e) => setSettings({ ...settings, brand_subtitle: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white"
                  placeholder="تولید کننده انواع لوله های پلی اتیلن"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  این متن دقیقا در یک خط زیر نام و لوگوی شرکت در بالای سمت راست تمام فاکتورها چاپ می‌شود.
                </span>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  شناسه ملی شرکت <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={settings.national_id || ""}
                  onChange={(e) => setSettings({ ...settings, national_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white"
                  placeholder="مثال: ۱۰۱۰۲۵۶۳۹۸۴"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">شماره ثبت شرکت</label>
                <input
                  type="text"
                  value={settings.registration_number || ""}
                  onChange={(e) => setSettings({ ...settings, registration_number: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white"
                  placeholder="مثال: ۴۵۲۱۸"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">کد اقتصادی</label>
                <input
                  type="text"
                  value={settings.economic_code || ""}
                  onChange={(e) => setSettings({ ...settings, economic_code: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white"
                  placeholder="مثال: ۴۱۱۵۶۷۸۹۱۲۳۴"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">شماره تلفن تماس کارخانه / دفتر</label>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white"
                  placeholder="مثال: ۰۲۱-۸۸۸۸۷۷۶۶"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">کد پستی ۱۰ رقمی</label>
                <input
                  type="text"
                  value={settings.postal_code || ""}
                  onChange={(e) => setSettings({ ...settings, postal_code: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white"
                  placeholder="مثال: ۱۹۸۷۶۵۴۳۲۱"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">آدرس کارخانه / دفتر مرکزی</label>
                <input
                  type="text"
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white"
                  placeholder="مثال: تهران، شهرک صنعتی شمس‌آباد، بلوار بوستان، نبش خیابان پنجم"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  درصد پیش‌فرض مالیات بر ارزش افزوده (VAT %)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.default_tax_percent}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        default_tax_percent: parseFloat(e.target.value) || 0,
                        default_tax_rate: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white"
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">٪</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Default Notes for Documents (3 Checkboxes & Expandable Text Boxes) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <FileText className="w-5 h-5 text-indigo-600" />
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white text-sm">
                  متن‌های پیش‌فرض اسناد (پیش‌فاکتور، فاکتور و رسید تحویل)
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  با فعال‌سازی هر بخش، متن وارد شده به عنوان شروط و توضیحات پیش‌فرض در پایین کادر توضیحات سند چاپ خواهد شد.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* 1. Proforma / Order Default Notes */}
              <div
                className={"p-4 rounded-2xl border transition-all " + (
                  settings.default_order_notes_enabled
                    ? "bg-blue-50/40 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800"
                    : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700"
                )}
              >
                <label className="flex items-center gap-2.5 cursor-pointer font-bold text-xs text-slate-900 dark:text-white select-none">
                  <input
                    type="checkbox"
                    checked={settings.default_order_notes_enabled}
                    onChange={(e) =>
                      setSettings({ ...settings, default_order_notes_enabled: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>درج خودکار متن پیش‌فرض در توضیحات پیش‌فاکتور (سفارشات)</span>
                  </span>
                </label>

                {settings.default_order_notes_enabled && (
                  <div className="mt-3 pt-3 border-t border-blue-200/70 dark:border-blue-900/60 space-y-1.5 animate-in fade-in">
                    <label className="block text-[11px] font-bold text-blue-900 dark:text-blue-300">
                      متن پیش‌فرض شروط پیش‌فاکتور:
                    </label>
                    <textarea
                      rows={3}
                      value={settings.default_order_notes_text}
                      onChange={(e) =>
                        setSettings({ ...settings, default_order_notes_text: e.target.value })
                      }
                      className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 leading-relaxed"
                      placeholder="متن شروط اعتبار پیش‌فاکتور، پیش‌پرداخت، هزینه حمل و ..."
                    />
                  </div>
                )}
              </div>

              {/* 2. Official Invoice Default Notes */}
              <div
                className={"p-4 rounded-2xl border transition-all " + (
                  settings.default_invoice_notes_enabled
                    ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800"
                    : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700"
                )}
              >
                <label className="flex items-center gap-2.5 cursor-pointer font-bold text-xs text-slate-900 dark:text-white select-none">
                  <input
                    type="checkbox"
                    checked={settings.default_invoice_notes_enabled}
                    onChange={(e) =>
                      setSettings({ ...settings, default_invoice_notes_enabled: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    <span>درج خودکار متن پیش‌فرض در توضیحات فاکتور رسمی فروش</span>
                  </span>
                </label>

                {settings.default_invoice_notes_enabled && (
                  <div className="mt-3 pt-3 border-t border-emerald-200/70 dark:border-emerald-900/60 space-y-1.5 animate-in fade-in">
                    <label className="block text-[11px] font-bold text-emerald-900 dark:text-emerald-300">
                      متن پیش‌فرض شروط فاکتور فروش:
                    </label>
                    <textarea
                      rows={3}
                      value={settings.default_invoice_notes_text}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          default_invoice_notes_text: e.target.value,
                          default_invoice_notes: e.target.value,
                        })
                      }
                      className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 leading-relaxed"
                      placeholder="متن شروط انطباق با استاندارد، مهلت بررسی متراژ، نحوه پرداخت و ..."
                    />
                  </div>
                )}
              </div>

              {/* 3. Delivery Note Default Notes */}
              <div
                className={"p-4 rounded-2xl border transition-all " + (
                  settings.default_delivery_notes_enabled
                    ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800"
                    : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700"
                )}
              >
                <label className="flex items-center gap-2.5 cursor-pointer font-bold text-xs text-slate-900 dark:text-white select-none">
                  <input
                    type="checkbox"
                    checked={settings.default_delivery_notes_enabled}
                    onChange={(e) =>
                      setSettings({ ...settings, default_delivery_notes_enabled: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <span className="flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-amber-600" />
                    <span>درج خودکار متن پیش‌فرض در توضیحات رسید تحویل کالا (بارگیری)</span>
                  </span>
                </label>

                {settings.default_delivery_notes_enabled && (
                  <div className="mt-3 pt-3 border-t border-amber-200/70 dark:border-amber-900/60 space-y-1.5 animate-in fade-in">
                    <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-300">
                      متن پیش‌فرض شروط رسید تحویل و بارگیری:
                    </label>
                    <textarea
                      rows={3}
                      value={settings.default_delivery_notes_text}
                      onChange={(e) =>
                        setSettings({ ...settings, default_delivery_notes_text: e.target.value })
                      }
                      className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 leading-relaxed"
                      placeholder="متن تایید شمارش متراژ لوله‌ها، تحویل به راننده، مسئولیت مهار بار و ..."
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>ذخیره کلیه تنظیمات و مشخصات شرکت</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: USER MANAGEMENT & GRANULAR ACCESS CONTROL */}
      {/* ========================================================================= */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {/* Action Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="جستجو در نام، نام کاربری یا سمت کاربر..."
                value={searchUserQuery}
                onChange={(e) => setSearchUserQuery(e.target.value)}
                className="w-full pl-3 pr-9 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white"
              />
            </div>

            <button
              onClick={handleOpenCreateUser}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>افزودن کاربر جدید</span>
            </button>
          </div>

          {/* Data Safety Notice for Users */}
          <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="font-bold">سیاست حفظ یکپارچگی داده‌ها:</strong> به منظور جلوگیری از آسیب به فاکتورها، رسیدهای تحویل، تراکنش‌های مالی و لاگ‌های امنیتی گذشته، امکان حذف فیزیکی هیچ کاربری در سیستم وجود ندارد. در صورت قطع همکاری یا تغییر پرسنل، صرفاً حساب کاربر را <strong>غیرفعال</strong> نمایید تا دسترسی وی مسدود شده اما سوابق اسناد ثبت‌شده حفظ بماند.
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold bg-slate-50 dark:bg-slate-800/60">
                    <th className="py-3 px-4">ردیف</th>
                    <th className="py-3 px-4">نام و نام خانوادگی</th>
                    <th className="py-3 px-4">نام کاربری</th>
                    <th className="py-3 px-4">کلمه عبور (قابل ارائه توسط مدیر)</th>
                    <th className="py-3 px-4">نقش سازمانی</th>
                    <th className="py-3 px-4">وضعیت حساب (فعال/غیرفعال)</th>
                    <th className="py-3 px-4">سطح دسترسی‌ها</th>
                    <th className="py-3 px-4 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        کاربری یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u, idx) => {
                      const isCurrentUser = u.id === activeUser.id;
                      return (
                        <tr
                          key={u.id}
                          className={"hover:bg-slate-50 dark:hover:bg-slate-800/50 transition " + (
                            isCurrentUser ? "bg-blue-50/30 dark:bg-blue-950/20" : ""
                          )}
                        >
                          <td className="py-3 px-4 font-mono text-slate-400 font-bold">{toPersianDigits(idx + 1)}</td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-blue-600/15 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                                {u.name ? u.name.charAt(0) : "U"}
                              </div>
                              <div>
                                <span>{u.name}</span>
                                {isCurrentUser && (
                                  <span className="mr-1.5 px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 font-bold">
                                    حساب جاری
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-200">
                            {u.username}
                          </td>
                          <td className="py-3 px-4 font-mono">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-[11px] border border-slate-200 dark:border-slate-700">
                              {u.password || "123456"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={"px-2.5 py-1 rounded-full text-[11px] font-bold " + (
                                u.is_admin
                                  ? "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              )}
                            >
                              {u.role_name}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => !isCurrentUser && handleToggleUserActive(u)}
                              disabled={isCurrentUser}
                              title={
                                isCurrentUser
                                  ? "حساب جاری فعال است"
                                  : u.is_active
                                  ? "کلیک جهت غیرفعال‌سازی حساب کاربری (حفظ اسناد و سوابق)"
                                  : "کلیک جهت فعال‌سازی حساب کاربری"
                              }
                              className={"inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition select-none " + (
                                isCurrentUser
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 cursor-default"
                                  : u.is_active
                                  ? "bg-emerald-50 text-emerald-700 hover:bg-rose-50 hover:text-rose-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                                  : "bg-rose-50 text-rose-700 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 border border-rose-200 dark:border-rose-800 cursor-pointer"
                              )}
                            >
                              <span className={"w-2 h-2 rounded-full " + (u.is_active ? "bg-emerald-500" : "bg-rose-500")}></span>
                              <span>{u.is_active ? "فعال" : "غیرفعال"}</span>
                            </button>
                          </td>
                          <td className="py-3 px-4">
                            {u.is_admin ? (
                              <span className="text-amber-700 dark:text-amber-400 font-black text-[11px] flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                دسترسی کامل به همه بخش‌ها
                              </span>
                            ) : (
                              <span className="text-slate-600 dark:text-slate-400 font-semibold text-[11px]">
                                {toPersianDigits(u.permissions?.length || 0)} مورد از {toPersianDigits(permissions.length)} دسترسی
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenEditUser(u)}
                                title="ویرایش مشخصات و تعیین دسترسی‌ها"
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {!isCurrentUser && (
                                <button
                                  onClick={() => handleToggleUserActive(u)}
                                  title={
                                    u.is_active
                                      ? "غیرفعال‌سازی کاربر (بدون حذف داده‌ها)"
                                      : "فعال‌سازی مجدد کاربر"
                                  }
                                  className={"p-1.5 rounded-lg transition cursor-pointer " + (
                                    u.is_active
                                      ? "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                                      : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                                  )}
                                >
                                  {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* USER CREATE / EDIT MODAL WITH GRANULAR PERMISSIONS */}
      {/* ========================================================================= */}
      {showUserModal && editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-sm">
                    {editingUser.id ? "ویرایش و تعیین دسترسی کاربر: " + editingUser.name : "تعریف کاربر جدید و تنظیم دسترسی‌ها"}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    تعیین نام کاربری، رمز عبور و مجوز ورود به صفحات و انجام عملیات
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Error & Success Notice */}
            {userModalError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{userModalError}</span>
              </div>
            )}
            {userModalSuccess && (
              <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shrink-0">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{userModalSuccess}</span>
              </div>
            )}

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveUserSubmit} className="space-y-5 mt-4 overflow-y-auto pr-1 flex-1 text-xs">
              {/* Basic Info Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    نام و نام خانوادگی <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingUser.name || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white"
                    placeholder="مثال: آقای صادقی"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    نام کاربری (جهت ورود به سیستم) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingUser.username || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white"
                    placeholder="مثال: sales_user"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    کلمه عبور <span className="text-rose-500">*</span>
                    <span className="text-[10px] text-slate-400 font-normal mr-1.5">(توسط مدیر قابل مشاهده و ارائه است)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required={!editingUser.id}
                      value={editingUser.password || ""}
                      onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white pl-10"
                      placeholder={editingUser.id ? "جهت تغییر وارد کنید..." : "کلمه عبور کاربر"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 dark:text-slate-300 font-bold">
                      نقش / سمت سازمانی <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">(تایپ دستی پیش‌فرض)</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    list="suggested-org-roles"
                    value={editingUser.role_name || ""}
                    onChange={(e) => {
                      const typedVal = e.target.value;
                      const matchedRole = roles.find((r) => r.name.trim() === typedVal.trim());
                      setEditingUser({
                        ...editingUser,
                        role_name: typedVal,
                        role_id: matchedRole ? matchedRole.id : (editingUser.role_id || "role-expert"),
                        permissions: matchedRole ? [...matchedRole.permissions] : editingUser.permissions,
                      });
                    }}
                    placeholder="سمت سازمانی را تایپ کنید (مثلاً: سرپرست تولید، انباردار و...)"
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white"
                  />
                  <datalist id="suggested-org-roles">
                    <option value="مدیر عامل و مدیریت ارشد" />
                    <option value="مدیر فروش و بازرگانی" />
                    <option value="کارشناس ارشد فروش" />
                    <option value="مدیر کارخانه" />
                    <option value="سرپرست خطوط تولید لوله" />
                    <option value="مسئول آزمایشگاه و کنترل کیفیت (QC)" />
                    <option value="مسئول انبار و تدارکات" />
                    <option value="مدیر مالی و حسابداری" />
                    <option value="کارشناس حسابداری و خزانه‌داری" />
                    <option value="مسئول ترابری و بارگیری" />
                  </datalist>

                  {/* Optional quick dropdown selector */}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[11px] text-slate-500 shrink-0">یا انتخاب از الگوهای آماده:</span>
                    <select
                      value=""
                      onChange={(e) => {
                        const selectedRole = roles.find((r) => r.id === e.target.value);
                        if (selectedRole) {
                          setEditingUser({
                            ...editingUser,
                            role_id: selectedRole.id,
                            role_name: selectedRole.name,
                            permissions: [...selectedRole.permissions],
                          });
                        }
                      }}
                      className="flex-1 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="" disabled>
                        -- انتخاب نقش نمونه جهت تکمیل خودکار --
                      </option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-2 flex flex-wrap items-center gap-6 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editingUser.is_active}
                      onChange={(e) => setEditingUser({ ...editingUser, is_active: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="font-bold text-slate-800 dark:text-slate-200">حساب کاربری فعال است</span>
                  </label>
                </div>
              </div>

              {/* Granular Permissions Section */}
              {(() => {
                const userPerms = editingUser.permissions || [];
                const allPermKeys = effectivePermissions.map((p) => p.key);
                const isAllSelected = allPermKeys.length > 0 && allPermKeys.every((k) => userPerms.includes(k));

                return (
                  <div className="space-y-4 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <h4 className="font-black text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-blue-600" />
                          <span>تعیین دقیق سطوح دسترسی (صفحه به صفحه و بخش به بخش):</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          مشخص کنید کاربر مجاز به ورود به کدام صفحات و انجام کدام عملیات است (با انتخاب همه بخش‌ها، کاربر به عنوان مدیر ارشد در نظر گرفته می‌شود):
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={handleSelectAllPermissions}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-bold text-[11px] transition cursor-pointer"
                        >
                          انتخاب همه (مدیر ارشد)
                        </button>
                        <button
                          type="button"
                          onClick={handleDeselectAllPermissions}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 font-bold text-[11px] transition cursor-pointer"
                        >
                          لغو انتخاب همه
                        </button>
                      </div>
                    </div>

                    {/* Status notification banner */}
                    {isAllSelected ? (
                      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 flex items-center gap-2.5 text-amber-900 dark:text-amber-200 text-xs font-bold shadow-xs">
                        <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>تمامی دسترسی‌های سیستم برای این کاربر فعال است (اختیارات کامل مدیر ارشد سامانه).</span>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 font-medium">
                        <span>تعداد دسترسی‌های فعال: <strong className="text-blue-600 dark:text-blue-400 font-bold font-mono">{toPersianDigits(userPerms.length)}</strong> از مجموع <strong className="font-mono">{toPersianDigits(effectivePermissions.length)}</strong> دسترسی</span>
                        {userPerms.length === 0 && (
                          <span className="text-rose-600 dark:text-rose-400 font-bold text-[11px]">هیچ دسترسی انتخاب نشده است</span>
                        )}
                      </div>
                    )}

                  {/* Permission Groups Accordion/Grid */}
                  <div className="space-y-3">
                    {permissionCategories.map((category) => {
                      const categoryPerms = effectivePermissions.filter((p) => p.category === category);
                      const userPerms = editingUser.permissions || [];
                      const allCatSelected = categoryPerms.every((p) => userPerms.includes(p.key));

                      return (
                        <div
                          key={category}
                          className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2.5"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-700">
                            <span className="font-black text-slate-800 dark:text-slate-200 text-xs">
                              {category}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleSelectAllCategoryPermissions(category)}
                              className="text-[10.5px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                            >
                              {allCatSelected ? "لغو انتخاب بخش" : "انتخاب همه این بخش"}
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {categoryPerms.map((perm) => {
                              const isChecked = userPerms.includes(perm.key);
                              return (
                                <label
                                  key={perm.key}
                                  className={"p-2 rounded-xl border transition-all flex items-start gap-2 cursor-pointer select-none text-[11px] " + (
                                    isChecked
                                      ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-950 dark:text-blue-200 font-bold"
                                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300"
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleTogglePermission(perm.key)}
                                    className="w-3.5 h-3.5 rounded text-blue-600 mt-0.5 shrink-0 cursor-pointer"
                                  />
                                  <div className="min-w-0">
                                    <div className="leading-snug">{perm.name}</div>
                                    <div className="text-[9.5px] text-slate-400 truncate mt-0.5">
                                      {perm.description}
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

              {/* Submit Buttons in Modal Footer */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  disabled={isSubmittingUser}
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer disabled:opacity-40"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmittingUser ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>در حال ذخیره...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>ذخیره کاربر و دسترسی‌ها</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BACKUP, RESTORE & SCHEDULED REMINDER */}
      {/* ========================================================================= */}
      {activeTab === "backup" && (
        <div className="space-y-5">
          {/* Section 1: Central Database Status & Multi-Device Sync */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      پایگاه‌داده اختصاصی MySQL هاست (مرجع زنده)
                    </h4>
                    <span className="text-[10.5px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      MySQL متصل و فعال
                    </span>
                    <button
                      type="button"
                      onClick={() => setHelpTopic("sync")}
                      className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-lg font-bold transition cursor-pointer"
                      title="مشاهده راهنمای همگام‌سازی و یکسانی اطلاعات در گوشی و کامپیوتر"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>راهنمای همگام‌سازی</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Laptop className="w-3.5 h-3.5 text-blue-500" />
                      کامپیوتر
                    </span>
                    <span>=</span>
                    <span className="flex items-center gap-1">
                      <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                      گوشی همراه
                    </span>
                    <span>=</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      داده‌های ۱۰۰٪ یکسان و بلادرنگ در تمام دستگاه‌ها
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <a
                  href={`/alborz_pipe_latest_package.zip?v=${Date.now()}`}
                  download="alborz_pipe_latest_package.zip"
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="دانلود پکیج کامل برنامه آماده استقرار روی هاست یا سیستم لوکال XAMPP/Wamp"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>دانلود پکیج کامل (هاست و سیستم لوکال)</span>
                </a>
                <button
                  type="button"
                  onClick={() => setIsDbSetupOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="پیکربندی و تنظیم مشخصات اتصال دیتابیس MySQL هاست"
                >
                  <Server className="w-3.5 h-3.5" />
                  <span>تنظیم اتصال MySQL</span>
                </button>
                <button
                  type="button"
                  onClick={handlePushToHost}
                  disabled={isSyncingHost}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  title="ذخیره و همگام‌سازی فوری داده‌ها در MySQL هاست"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingHost ? "animate-spin" : ""}`} />
                  <span>همگام‌سازی با MySQL</span>
                </button>
                <button
                  type="button"
                  onClick={handleSyncFromHost}
                  disabled={isSyncingHost}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="دریافت آخرین نسخه اطلاعات از MySQL هاست"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>دریافت از سرور</span>
                </button>
              </div>
            </div>

            {hostSyncMsg && (
              <div
                className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                  hostSyncMsg.type === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
                    : "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300"
                }`}
              >
                {hostSyncMsg.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{hostSyncMsg.text}</span>
              </div>
            )}
          </div>

          {/* Section 2: Primary Truth - SQL Dump Backup & Restore */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-blue-500/30 dark:border-blue-500/40 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-150 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      پایگاه‌داده اصلی و رسمی (فایل SQL Dump)
                    </h3>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      معیار اصلی و مرجع داده‌ها
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    شامل ساختار کامل تمام ۲۵ جدول، روابط، مشتریان، فاکتورها، انبار و کلیه داده‌های زنده دیتابیس MySQL
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setHelpTopic("sql")}
                className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 px-3 py-1.5 rounded-xl font-bold transition cursor-pointer shrink-0"
              >
                <HelpCircle className="w-4 h-4" />
                <span>راهنمای دیتابیس اصلی SQL</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SQL Backup Download */}
              <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/50 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs">
                    <Download className="w-4 h-4 text-blue-600" />
                    <span>دانلود نسخه پشتیبان اصلی پایگاه‌داده (SQL)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    فایل استاندارد اسکریپت MySQL Dump (.sql) با فرمت utf8mb4؛ قابل نگهداری در رایانه، بازیابی در همین سامانه یا ایمپورت مستقیم در phpMyAdmin.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSqlBackupDownload}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>دانلود فایل پشتیبان اصلی (.sql)</span>
                </button>
              </div>

              {/* SQL Restore Upload */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs">
                    <Upload className="w-4 h-4 text-emerald-600" />
                    <span>بازیابی پایگاه‌داده از فایل SQL</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    فایل اسکریپت .sql پشتیبان را انتخاب کنید تا مستقیماً در دیتابیس MySQL هاست اجرا و روی تمام دستگاه‌ها اعمال گردد.
                  </p>
                </div>

                <label className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer border border-slate-700">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>انتخاب و بازیابی فایل پایگاه‌داده (.sql)</span>
                  <input
                    type="file"
                    accept=".sql,.json"
                    onChange={handleFileSelectForRestore}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Section 3: Auxiliary Option - JSON Backup (Purely Secondary) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      فایل کمکی JSON (آرشیو سبک و فرعی)
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      کمکی و اختیاری (بدون تداخل با دیتابیس)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    صرفاً یک نسخه متنی فرعی جهت نگهداری سبک؛ هیچ‌گونه تغییری در ساختار دیتابیس اصلی MySQL ایجاد نمی‌کند.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setHelpTopic("json")}
                className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 px-3 py-1.5 rounded-xl font-bold transition cursor-pointer shrink-0"
              >
                <HelpCircle className="w-4 h-4" />
                <span>راهنمای فایل کمکی JSON</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handleJsonBackupDownload}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span>دانلود بکاپ کمکی JSON</span>
              </button>

              <label className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer border border-slate-200 dark:border-slate-700">
                <Upload className="w-4 h-4 text-slate-500" />
                <span>بازیابی از فایل کمکی JSON</span>
                <input
                  type="file"
                  accept=".json,.sql"
                  onChange={handleFileSelectForRestore}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Restore Notice Message */}
          {restoreMsg && (
            <div
              className={"p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 " + (
                restoreMsg.type === "error"
                  ? "bg-rose-50 border-rose-200 text-rose-800"
                  : "bg-emerald-50 border-emerald-200 text-emerald-800"
              )}
            >
              {restoreMsg.type === "error" ? (
                <AlertCircle className="w-5 h-5 shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              )}
              <span>{restoreMsg.text}</span>
            </div>
          )}

          {/* Restore Confirmation Preview Modal / Card */}
          {restorePreviewData && (
            <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-800 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>تایید و پیش‌نمایش فایل انتخاب‌شده جهت بازیابی:</span>
                </div>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-bold border border-amber-300 dark:border-amber-700">
                  فرمت: {restorePreviewData.type === "sql" ? "اسکریپت رسمی پایگاه‌داده (SQL Dump)" : "فایل کمکی (JSON)"}
                </span>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-800/80 text-xs flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-slate-500">نام فایل: </span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{restoreFileName}</span>
                </div>
                <div>
                  <span className="text-slate-500">مشخصات شرکت / عنوان: </span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">{restorePreviewData.companyName}</span>
                </div>
                <div>
                  <span className="text-slate-500">حجم: </span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{restorePreviewData.fileSize}</span>
                </div>
                <div>
                  <span className="text-slate-500">نوع عملیات: </span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {restorePreviewData.type === "sql" ? "اجرای مستقیم در MySQL هاست" : "بازنویسی رکوردهای محلی و همگام‌سازی"}
                  </span>
                </div>
              </div>

              {restorePreviewData.type === "json" && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-800">
                    <div className="text-slate-500 text-[10.5px]">مشتریان:</div>
                    <div className="text-base font-black text-slate-900 dark:text-white font-mono">
                      {toPersianDigits(restorePreviewData.customersCount || 0)}
                    </div>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-800">
                    <div className="text-slate-500 text-[10.5px]">فاکتورهای فروش:</div>
                    <div className="text-base font-black text-slate-900 dark:text-white font-mono">
                      {toPersianDigits(restorePreviewData.invoicesCount || 0)}
                    </div>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-800">
                    <div className="text-slate-500 text-[10.5px]">سفارش‌ها:</div>
                    <div className="text-base font-black text-slate-900 dark:text-white font-mono">
                      {toPersianDigits(restorePreviewData.ordersCount || 0)}
                    </div>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-800">
                    <div className="text-slate-500 text-[10.5px]">گزارشات تولید:</div>
                    <div className="text-base font-black text-slate-900 dark:text-white font-mono">
                      {toPersianDigits(restorePreviewData.productionLogsCount || 0)}
                    </div>
                  </div>
                </div>
              )}

              {restorePreviewData.type === "sql" && (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-blue-200 dark:border-blue-800">
                      <div className="text-slate-500 text-[10.5px]">مشتریان شناسایی‌شده:</div>
                      <div className="text-base font-black text-blue-700 dark:text-blue-400 font-mono">
                        {toPersianDigits(restorePreviewData.customersCount || 0)}
                      </div>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-blue-200 dark:border-blue-800">
                      <div className="text-slate-500 text-[10.5px]">فاکتورها:</div>
                      <div className="text-base font-black text-blue-700 dark:text-blue-400 font-mono">
                        {toPersianDigits(restorePreviewData.invoicesCount || 0)}
                      </div>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-blue-200 dark:border-blue-800">
                      <div className="text-slate-500 text-[10.5px]">سفارش‌ها:</div>
                      <div className="text-base font-black text-blue-700 dark:text-blue-400 font-mono">
                        {toPersianDigits(restorePreviewData.ordersCount || 0)}
                      </div>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-blue-200 dark:border-blue-800">
                      <div className="text-slate-500 text-[10.5px]">کل دستورات داده:</div>
                      <div className="text-base font-black text-blue-700 dark:text-blue-400 font-mono">
                        {toPersianDigits(restorePreviewData.statementCount || 0)}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 text-blue-900 dark:text-blue-200 text-xs font-semibold leading-relaxed">
                    این اسکریپت SQL بررسی و آماده‌سازی شد. ساختار کامل ۲۵ جدول (CREATE TABLE) به آن پیوست گردیده تا در صورت ایمپورت در phpMyAdmin با خطای <span className="font-mono text-red-600 dark:text-red-400">#1146 Table doesn't exist</span> مواجه نشوید. همچنین می‌توانید با دکمه زیر اطلاعات را مستقیماً در دیتابیس MySQL هاست و سیستم بازیابی فرمایید.
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-200 dark:border-amber-800">
                <span className="text-[11px] text-amber-800 dark:text-amber-300 font-bold">
                  هشدار: تایید بازیابی باعث جایگزینی داده‌های دیتابیس با این فایل خواهد شد.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isProcessingRestore}
                    onClick={() => {
                      setRestorePreviewData(null);
                      setRestoreFileContent("");
                      setRestoreFileFormat(null);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer"
                  >
                    انصراف
                  </button>

                  {restorePreviewData.type === "sql" && (
                    <button
                      type="button"
                      onClick={handleDownloadRepairedSql}
                      className="px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-bold text-xs border border-blue-200 dark:border-blue-800 cursor-pointer flex items-center gap-1.5"
                      title="دانلود اسکریپت کامل همراه با استراکچر و بدون خطای ۱۱۴۶ برای phpMyAdmin"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>دانلود نسخه اصلاح‌شده جهت phpMyAdmin</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isProcessingRestore}
                    onClick={handleConfirmRestore}
                    className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isProcessingRestore && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>تایید و اجرای بازیابی پایگاه‌داده</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Scheduled Reminder & Clean Factory Reset */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Backup Reminder Schedule Card */}
            <form
              onSubmit={handleSaveReminderSettings}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs">
                    <Bell className="w-4 h-4 text-amber-500" />
                    <span>تنظیم زمان‌بندی یادآور پشتیبان‌گیری</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHelpTopic("reminder")}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                    title="راهنمای سیستم یادآور"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer font-bold text-slate-800 dark:text-slate-200 select-none text-xs">
                  <input
                    type="checkbox"
                    checked={settings.backup_reminder_enabled}
                    onChange={(e) =>
                      setSettings({ ...settings, backup_reminder_enabled: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <span>فعال‌سازی سیستم هشدار دوره‌ای</span>
                </label>

                {settings.backup_reminder_enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1 text-[11px]">
                        دوره تکرار هشدار
                      </label>
                      <select
                        value={settings.backup_reminder_interval_days}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            backup_reminder_interval_days: parseInt(e.target.value) || 7,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold focus:outline-none text-slate-900 dark:text-white text-xs"
                      >
                        <option value={1}>هر روز (روزانه)</option>
                        <option value={3}>هر ۳ روز</option>
                        <option value={7}>هر هفته (۷ روز - پیش‌فرض)</option>
                        <option value={14}>هر دو هفته</option>
                        <option value={30}>هر ماه</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1 text-[11px]">
                        وضعیت آخرین بکاپ
                      </label>
                      <div
                        className={"px-3 py-2 rounded-xl border font-bold text-[11px] flex items-center gap-1 " + (
                          backupStatus.isOverdue
                            ? "bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-800 dark:text-rose-300"
                            : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300"
                        )}
                      >
                        {backupStatus.isOverdue ? (
                          <>
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>نیازمند بکاپ ({toPersianDigits(backupStatus.daysSinceLastBackup)} روز)</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>وضعیت به‌روز و امن</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>ذخیره تنظیمات یادآور</span>
                </button>
              </div>
            </form>

            {/* Clean Wipe / Factory Reset Card */}
            <div className="bg-rose-50/70 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-800/80 p-5 shadow-xs flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-2.5 border-b border-rose-200/60 dark:border-rose-900/40">
                  <div className="flex items-center gap-2 text-rose-900 dark:text-rose-300 font-bold text-xs">
                    <RotateCcw className="w-4 h-4 text-rose-600" />
                    <span>تخلیه کامل و پاک‌سازی داده‌ها (صفر کردن سیستم)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHelpTopic("reset")}
                    className="text-rose-600 dark:text-rose-400 hover:text-rose-800 p-1 cursor-pointer"
                    title="راهنمای پاک‌سازی کامل سیستم"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-[11.5px] text-rose-800 dark:text-rose-300 leading-relaxed">
                  این عملیات تمام داده‌های سیستم شامل مشتریان، فاکتورها، انبار، پرسنل و هزینه‌ها را به طور قطعی پاک کرده و دیتابیس را <b>با ۰ رکورد و بدون هیچ داده نمونه‌ای</b> آماده ثبت اطلاعات واقعی شما می‌کند.
                </p>
                <div className="p-2.5 bg-rose-100/70 dark:bg-rose-900/40 rounded-xl text-[10.5px] font-semibold text-rose-900 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                  صرفاً حساب کاربری مدیر ارشد جهت ورود شما محفوظ باقی می‌ماند.
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetToDefaultData}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>تخلیه کامل و بازنشانی دیتابیس به نقطه صفر</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: AUDIT LOGS */}
      {/* ========================================================================= */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          {!StorageService.isAdmin() && !StorageService.hasPermission('settings.audit') ? (
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-8 text-center">
              <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-rose-900 dark:text-rose-200 mb-1">
                دسترسی به این بخش محدود شده است
              </h3>
              <p className="text-xs text-rose-700 dark:text-rose-300 max-w-md mx-auto leading-relaxed">
                سوابق امنیتی و لاگ‌های ثبت، ویرایش، تایید و لغو اسناد منحصراً برای کاربران دارای مجوز دسترسی (مدیر یا دسترسی سوابق) قابل مشاهده و استخراج می‌باشد.
              </p>
            </div>
          ) : (
            <>
              {/* Header Controls & Filters */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                      <History className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        سوابق و لاگ‌های جامع تغییرات و رویدادهای سیستم
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        مشاهده کاربر ثبت‌کننده، زمان، نوع تغییرات و مقادیر قبل و بعد به تفکیک تمام صفحات (برای مشاهده جزئیات کامل روی هر سطر کلیک کنید)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl font-bold">
                      {toPersianDigits(filteredLogs.length)} مورد از {toPersianDigits(logs.length)}
                    </span>
                    <button
                      onClick={handleExportAuditExcel}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                      title="دانلود فایل اکسل کامل لاگ‌های سیستم"
                    >
                      <Download className="w-4 h-4" />
                      <span>خروجی اکسل لاگ‌ها</span>
                    </button>
                  </div>
                </div>

                {/* Filter Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                  {/* Search query */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="جستجو در متن، کاربر، شماره سند..."
                      value={searchLogQuery}
                      onChange={(e) => setSearchLogQuery(e.target.value)}
                      className="w-full pl-3 pr-9 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Section / Entity Filter */}
                  <div>
                    <select
                      value={entityFilter}
                      onChange={(e) => setEntityFilter(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white cursor-pointer"
                    >
                      <option value="ALL">همه بخش‌های سیستم</option>
                      <option value="ORDER">سفارش‌ها</option>
                      <option value="INVOICE">فاکتورها</option>
                      <option value="DELIVERY">حواله و رسید تحویل</option>
                      <option value="RETURN">مرجوعی کالا</option>
                      <option value="CHEQUE">چک‌ها و اسناد دریافتنی/پرداختنی</option>
                      <option value="PAYMENT">دریافت و پرداخت نقدی/بانکی</option>
                      <option value="CUSTOMER">مشتریان و حساب‌ها</option>
                      <option value="EMPLOYEE">پرسنل، مرخصی و تسویه</option>
                      <option value="WAREHOUSE">انبار و مواد اولیه</option>
                      <option value="EXPENSE">هزینه‌های جاری</option>
                      <option value="PRODUCTION">تولید روزانه</option>
                      <option value="USER">کاربران و دسترسی‌ها</option>
                      <option value="AUTH">ورود و امنیت</option>
                    </select>
                  </div>

                  {/* Action Filter */}
                  <div>
                    <select
                      value={actionFilter}
                      onChange={(e) => setActionFilter(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white cursor-pointer"
                    >
                      <option value="ALL">همه انواع عملیات</option>
                      <option value="create">ثبت و ایجاد جدید</option>
                      <option value="update">ویرایش و تغییرات</option>
                      <option value="confirm">تأیید نهایی</option>
                      <option value="cancel">لغو و ابطال</option>
                      <option value="delete">حذف</option>
                      <option value="print">چاپ سند</option>
                      <option value="auth">ورود به سیستم</option>
                    </select>
                  </div>

                  {/* User Filter */}
                  <div>
                    <select
                      value={userFilter}
                      onChange={(e) => setUserFilter(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white cursor-pointer"
                    >
                      <option value="ALL">همه کاربران</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.username})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Audit Logs Table */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs table-fixed min-w-[920px]">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold bg-slate-50 dark:bg-slate-800/60">
                        <th className="py-3 px-2 text-center w-12">ردیف</th>
                        <th className="py-3 px-2 text-center w-32">تاریخ و زمان</th>
                        <th className="py-3 px-2 text-center w-32">کاربر اقدام‌کننده</th>
                        <th className="py-3 px-2 text-center w-28">بخش سیستم</th>
                        <th className="py-3 px-2 text-center w-28">نوع عملیات</th>
                        <th className="py-3 px-2 text-center w-24">شماره سند</th>
                        <th className="py-3 px-4 text-right">شرح رویداد</th>
                        <th className="py-3 px-2 text-center w-28">جزئیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredLogs.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400">
                            رویدادی مطابق با فیلترهای انتخابی یافت نشد.
                          </td>
                        </tr>
                      ) : (
                        filteredLogs.map((log, idx) => {
                          const narrative = formatAuditNarrative(log);
                          const diffs = getAuditFieldDiffs(log);
                          const entityLabel = (ENTITY_LABELS as any)[log.entity_type?.toUpperCase()] || log.entity_type;

                          // Color badge for action
                          const actionLower = (log.action || '').toLowerCase();
                          let badgeBg = "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300";
                          if (actionLower.includes("ثبت") || actionLower.includes("ایجاد") || actionLower.includes("صدور")) {
                            badgeBg = "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800";
                          } else if (actionLower.includes("ویرایش") || actionLower.includes("تغییر")) {
                            badgeBg = "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800";
                          } else if (actionLower.includes("تایید")) {
                            badgeBg = "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800";
                          } else if (actionLower.includes("لغو") || actionLower.includes("ابطال") || actionLower.includes("حذف")) {
                            badgeBg = "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800";
                          } else if (actionLower.includes("چاپ")) {
                            badgeBg = "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700";
                          }

                          const authorUser = users.find((u) => u.id === log.user_id || (log.user_code && u.user_code === log.user_code));
                          const authorDisplayName = authorUser ? authorUser.name : (log.user_name || "کاربر سیستم");
                          const authorDisplayRole = authorUser ? authorUser.role_name : (log.user_role || "");
                          const authorCode = authorUser?.user_code || log.user_code;

                          return (
                            <tr
                              key={log.id}
                              onClick={() => setSelectedLogForDetail(log)}
                              className="hover:bg-blue-50/40 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                            >
                              <td className="py-3 px-2 text-center font-mono text-slate-400 font-bold">
                                {toPersianDigits(idx + 1)}
                              </td>
                              <td className="py-3 px-2 text-center text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                                {formatJalaliDateTime(log.created_at)}
                              </td>
                              <td className="py-3 px-2 text-center">
                                <div className="font-bold text-slate-900 dark:text-white truncate flex items-center justify-center gap-1">
                                  <span>{authorDisplayName}</span>
                                  {authorCode && (
                                    <span className="font-mono text-[9.5px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1 py-0.2 rounded border border-slate-200 dark:border-slate-700">
                                      {authorCode}
                                    </span>
                                  )}
                                </div>
                                {authorDisplayRole && (
                                  <span className="text-[10px] text-slate-400">({authorDisplayRole})</span>
                                )}
                              </td>
                              <td className="py-3 px-2 text-center">
                                <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 truncate inline-block max-w-[100px]">
                                  {entityLabel}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-center">
                                <span className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold ${badgeBg} truncate inline-block max-w-[100px]`}>
                                  {log.action}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-center font-mono font-bold text-slate-700 dark:text-slate-300 text-xs truncate" title={log.document_number || log.entity_id || "-"}>
                                {log.document_number || log.entity_id || "-"}
                              </td>
                              <td className="py-3 px-4">
                                <div
                                  className="text-slate-700 dark:text-slate-300 text-xs font-medium leading-relaxed line-clamp-2 break-words"
                                  title={narrative}
                                >
                                  {narrative}
                                </div>
                              </td>
                              <td className="py-3 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedLogForDetail(log);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[11px] font-bold transition cursor-pointer border border-blue-200 dark:border-blue-800 shadow-2xs"
                                  title="مشاهده فرم کامل جزئیات لاگ"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>جزئیات</span>
                                  {diffs.length > 0 && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                  )}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Complete Audit Log Detail Modal */}
      {selectedLogForDetail && (
        <AuditLogDetailModal
          log={selectedLogForDetail}
          onClose={() => setSelectedLogForDetail(null)}
        />
      )}

      {/* Guide & Explanation Modal (راهنما و توضیحات دقیق) */}
      {helpTopic && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-150 dark:border-slate-800">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-sm">
                <HelpCircle className="w-5 h-5" />
                <span>
                  {helpTopic === "sql" && "راهنمای پایگاه‌داده اصلی SQL (معیار اصلی و حقیقت سیستم)"}
                  {helpTopic === "sync" && "راهنمای همگام‌سازی و یکسانی داده‌ها در تمام دستگاه‌ها"}
                  {helpTopic === "json" && "راهنمای فایل کمکی JSON (آرشیو سبک بدون تداخل)"}
                  {helpTopic === "reset" && "راهنمای بازنشانی و تخلیه کامل داده‌ها (صفر کردن دیتابیس)"}
                  {helpTopic === "reminder" && "راهنمای سیستم یادآور دوره‌ای پشتیبان‌گیری"}
                  {helpTopic === "user_code" && "راهنمای کد یکتا و شناسه دائمی کاربر"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setHelpTopic(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed space-y-3">
              {helpTopic === "sql" && (
                <>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900 text-blue-950 dark:text-blue-200 font-bold">
                    فایل اس‌کیو‌ال (SQL Dump) مرجع قطعی و اصلی کلیه داده‌های نرم‌افزار است.
                  </div>
                  <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                    <li><b className="text-slate-800 dark:text-slate-200">حفظ کامل ساختار داده‌ها:</b> این فایل شامل ساختار تمام ۲۵ جدول، روابط، مشتریان، فاکتورها، انبار، پرسنل و دستورات درج مستقیم داده‌ها (INSERT INTO) می‌باشد.</li>
                    <li><b className="text-slate-800 dark:text-slate-200">سازگاری و استانداردهای جهانی:</b> مستقیماً در phpMyAdmin، MySQL Workbench، کنسول‌های سرور لینوکس و تمامی دیتابیس‌های MySQL 5.7+ و 8.0+ بدون نقص قابل بازیابی است.</li>
                    <li><b className="text-slate-800 dark:text-slate-200">بازیابی مستقیم در هاست:</b> با انتخاب این فایل در بخش بازیابی، اسکریپت بدون واسطه روی پایگاه‌داده MySQL هاست اجرا شده و بلافاصله در تمام گوشی‌ها و کامپیوترها منعکس می‌شود.</li>
                  </ul>
                </>
              )}

              {helpTopic === "sync" && (
                <>
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-900 text-emerald-950 dark:text-emerald-200 font-bold">
                    تضمین یکسانی داده‌ها: هرآنچه در کامپیوتر یا گوشی ثبت شود، در تمام دستگاه‌ها یکسان است.
                  </div>
                  <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                    <li><b className="text-slate-800 dark:text-slate-200">دیتابیس مرکزی واحد:</b> تمام دستگاه‌ها (گوشی همراه، تبلت کارخانه، کامپیوتر دفتر) به یک دیتابیس مشترک متصل هستند و از یک منبع خوانده می‌شوند.</li>
                    <li><b className="text-slate-800 dark:text-slate-200">همگام‌سازی بلادرنگ:</b> هنگام باز کردن نرم‌افزار، جابجایی بین منوها یا ثبت فاکتور/سفارش جدید، داده‌ها به صورت خودکار با هاست همگام (Sync) می‌شوند.</li>
                    <li><b className="text-slate-800 dark:text-slate-200">دکمه همگام‌سازی فوری:</b> با کلیک بر روی دکمه «همگام‌سازی با MySQL» می‌توانید هر زمان که مایل بودید وضعیت را به صورت دستی بروز کنید.</li>
                  </ul>
                </>
              )}

              {helpTopic === "json" && (
                <>
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold">
                    فایل کمکی JSON یک نسخه فرعی و اختیاری است و هیچ تداخلی با دیتابیس اصلی ایجاد نمی‌کند.
                  </div>
                  <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                    <li><b className="text-slate-800 dark:text-slate-200">صرفاً گزینه کمکی:</b> این گزینه تنها برای آرشیو متنی سبک در حافظه کاربر ایجاد شده و اختیاری است.</li>
                    <li><b className="text-slate-800 dark:text-slate-200">عدم تغییر در دیتابیس:</b> دانلود یا نگهداری این فایل هیچ دخل و تصرفی در دیتابیس اصلی MySQL هاست ایجاد نکرده و خللی در کار سیستم به وجود نمی‌آورد.</li>
                  </ul>
                </>
              )}

              {helpTopic === "reset" && (
                <>
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-950 dark:text-rose-200 font-bold">
                    تخلیه کامل: کلیه اطلاعات پاک شده و هیچ رکورد نمونه یا تستی باقی نخواهد ماند.
                  </div>
                  <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                    <li><b className="text-slate-800 dark:text-slate-200">صفر کردن ۱۰۰٪ داده‌ها:</b> تمامی فاکتورها، سفارش‌ها، چک‌ها، حواله‌ها، مشتریان، انبار، پرسنل و هزینه‌ها حذف می‌شوند.</li>
                    <li><b className="text-slate-800 dark:text-slate-200">بدون اطلاعات ساختگی:</b> سیستم به حالت کاملاً تمیز و خام درمی‌آید تا فقط اطلاعات واقعی کسب‌وکار شما در آن درج گردد.</li>
                    <li><b className="text-slate-800 dark:text-slate-200">حفظ حساب مدیریت:</b> صرفاً حساب کاربری مدیر ارشد سیستم باقی می‌ماند تا امکان ورود و استفاده بدون وقفه فراهم باشد.</li>
                  </ul>
                </>
              )}

              {helpTopic === "reminder" && (
                <>
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900 text-amber-950 dark:text-amber-200 font-bold">
                    سیستم یادآور دوره‌ای برای جلوگیری از فراموشی پشتیبان‌گیری منظم طراحی شده است.
                  </div>
                  <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                    <li>سیستم از تاریخ آخرین دانلود نسخه پشتیبان روزشمار را محاسبه می‌کند.</li>
                    <li>در صورتی که دوره انتخابی (مثلاً ۷ روز) سپری شده باشد، نوار هشدار ملایمی در بالای صفحه ظاهر می‌شود تا شما را به تهیه نسخه پشتیبان ترغیب نماید.</li>
                  </ul>
                </>
              )}

              {helpTopic === "user_code" && (
                <>
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-900 text-indigo-950 dark:text-indigo-200 font-bold">
                    کد یکتا (User Code) شناسه اختصاصی و تغییرناپذیر پرسنل در سوابق سیستم است.
                  </div>
                  <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                    <li>حتی در صورت تغییر نام یا نام کاربری در آینده، کلیه سوابق، لاگ‌ها و امضاهای الکترونیکی با این کد یکتا متصل مانده و تاریخچه رویدادها هرگز مخدوش نخواهد شد.</li>
                  </ul>
                </>
              )}
            </div>

            <div className="pt-3 border-t border-slate-150 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setHelpTopic(null)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                متوجه شدم، بستن پنجره
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MySQL Host Database Setup & Configuration Modal */}
      <DatabaseSetupModal
        isOpen={isDbSetupOpen}
        onClose={() => setIsDbSetupOpen(false)}
        onSuccess={() => loadAllData()}
      />
    </div>
  );
};
