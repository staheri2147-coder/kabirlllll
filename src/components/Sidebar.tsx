import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { User } from '../types';
import {
  FilePlus2,
  FileText,
  Receipt,
  Truck,
  Users,
  UserCheck,
  Wallet,
  Boxes,
  Factory,
  BarChart3,
  Settings,
  LogOut,
  UserCircle2,
  X,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  currentUser?: User;
  onLogout?: () => void;
  onUserSwitch?: (user: User) => void;
  counts?: {
    draftOrders?: number;
    activeInvoices?: number;
    pendingDeliveries?: number;
    pendingCheques?: number;
  };
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  currentUser: propUser,
  onLogout,
  onUserSwitch,
  counts,
  isMobileOpen,
  onCloseMobile,
}) => {
  const [activeUser, setActiveUser] = useState<User>(propUser || StorageService.getActiveUser());
  const [users, setUsers] = useState<User[]>(StorageService.getUsers());
  const [showUserModal, setShowUserModal] = useState(false);

  useEffect(() => {
    if (propUser) {
      setActiveUser(propUser);
    } else {
      setActiveUser(StorageService.getActiveUser());
    }
    setUsers(StorageService.getUsers());
  }, [propUser]);

  const handleSwitchUser = (user: User) => {
    StorageService.setActiveUser(user.id);
    setActiveUser(user);
    setShowUserModal(false);
    StorageService.logAudit(`تغییر کاربر به ${user.name}`, 'AUTH', user.id);
    if (onUserSwitch) {
      onUserSwitch(user);
    }
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const handleLogoutClick = () => {
    setShowUserModal(false);
    if (onLogout) {
      onLogout();
    } else {
      StorageService.logout();
      window.location.reload();
    }
  };

  const handleItemClick = (tabId: string) => {
    onSelectTab(tabId);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  // Filter items based on user's granted permissions
  const primaryMenuItems = [
    { id: 'new_order', label: 'ثبت سفارش جدید', icon: FilePlus2, highlight: true },
    { id: 'orders', label: 'سفارش‌ها (پیش‌فاکتور)', icon: FileText, badge: counts?.draftOrders },
    { id: 'invoices', label: 'فاکتورهای فروش', icon: Receipt, badge: counts?.activeInvoices },
    { id: 'deliveries', label: 'رسیدهای تحویل کالا', icon: Truck, badge: counts?.pendingDeliveries },
    { id: 'customers', label: 'حساب و پرونده مشتریان', icon: Users },
  ].filter((item) => StorageService.canAccessTab(item.id, activeUser));

  // Bottom group: کارخانه، پرسنل، مالی و مدیریت
  const secondaryMenuItems = [
    { id: 'employees', label: 'مدیریت پرسنل', icon: UserCheck },
    { id: 'expenses', label: 'هزینه‌ها', icon: Wallet },
    { id: 'warehouse', label: 'مواد اولیه', icon: Boxes },
    { id: 'production', label: 'مدیریت خط تولید', icon: Factory },
    { id: 'settings', label: 'تنظیمات و پشتیبان', icon: Settings },
  ].filter((item) => StorageService.canAccessTab(item.id, activeUser));

  const renderNavBody = () => (
    <>
      <div className="space-y-4 overflow-y-auto pr-0.5 flex-1">
        {/* Primary Group */}
        <div>
          <div className="px-3 pb-2 text-[12px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider">
            فروش و مشتریان
          </div>
          <div className="space-y-1">
            {primaryMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs font-bold'
                      : item.highlight
                      ? 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100/90 dark:hover:bg-blue-900/60 font-bold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive
                          ? 'text-white'
                          : item.highlight
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    />
                    <span className="leading-snug">{item.label}</span>
                  </div>

                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold font-mono ${
                        isActive
                          ? 'bg-white/25 text-white'
                          : 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300'
                      }`}
                    >
                      {item.badge.toLocaleString('fa-IR')}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Group */}
        <div>
          <div className="px-3 pb-2 text-[12px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider">
            عملیات و مدیریت
          </div>
          <div className="space-y-1">
            {secondaryMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs font-bold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    />
                    <span className="leading-snug">{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* User Profile & Logout Box at bottom of Sidebar */}
      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
        <div
          onClick={() => setShowUserModal(true)}
          className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-700 flex items-center justify-between cursor-pointer transition shadow-2xs group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
              {activeUser.name ? activeUser.name.charAt(0) : 'U'}
            </div>
            <div className="min-w-0 text-right">
              <div className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                {activeUser.name}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold truncate mt-0.5">
                {activeUser.role_name}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowUserModal(true);
            }}
            title="تغییر کاربر یا خروج"
            className="p-2 rounded-xl text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* 1. Desktop Fixed Sidebar */}
      <aside className="hidden md:flex w-64 bg-white dark:bg-slate-900 border-l border-slate-200/90 dark:border-slate-800 sticky top-16 h-[calc(100vh-4rem)] flex-col justify-between p-3.5 shrink-0 no-print select-none">
        {renderNavBody()}
      </aside>

      {/* 2. Mobile Responsive Drawer Overlay (Opens from the RIGHT) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden no-print">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Slide-out Drawer strictly anchored to the RIGHT side */}
          <aside className="fixed top-0 right-0 bottom-0 z-50 w-72 max-w-[85vw] h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between p-4 shadow-2xl overflow-hidden select-none animate-in slide-in-from-right duration-200">
            {/* Drawer Top Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                  PE
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-slate-100">
                    منوی سامانه
                  </div>
                  <div className="text-[10px] text-slate-400">
                    کبیر لوله دره شهر
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onCloseMobile}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                aria-label="بستن منو"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {renderNavBody()}
          </aside>
        </div>
      )}

      {/* User Switcher / Logout Modal (Shared between Desktop & Mobile) */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in no-print">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                <UserCheck className="w-5 h-5 text-blue-600" />
                <span>حساب کاربری و تغییر کاربر</span>
              </div>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
              کاربر جاری: <strong className="text-slate-800 dark:text-slate-200">{activeUser.name}</strong> ({activeUser.role_name}). جهت تغییر حساب یا تست دسترسی‌ها، کاربر مورد نظر را انتخاب نمایید:
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {users.map((u) => (
                <div
                  key={u.id}
                  onClick={() => handleSwitchUser(u)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    u.id === activeUser.id
                      ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center font-bold text-xs">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{u.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        نام کاربری: <span className="font-mono">{u.username}</span> • <span className="text-blue-600 dark:text-blue-400 font-semibold">{u.role_name}</span>
                      </div>
                    </div>
                  </div>
                  {u.id === activeUser.id && (
                    <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-full">
                      کاربر جاری
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleLogoutClick}
                className="px-3.5 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>خروج از سامانه</span>
              </button>

              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
