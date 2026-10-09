import React, { useState, useEffect } from 'react';
import { StorageService } from './services/storageService';
import { User } from './types';
import { LoginPage } from './components/Auth/LoginPage';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/Dashboard/DashboardView';
import { CustomerManager } from './components/Customers/CustomerManager';
import { ProductManager } from './components/Products/ProductManager';
import { OrderManager } from './components/Orders/OrderManager';
import { OrderForm } from './components/Orders/OrderForm';
import { InvoiceManager } from './components/Invoices/InvoiceManager';
import { PaymentManager } from './components/Payments/PaymentManager';
import { ChequeManager } from './components/Cheques/ChequeManager';
import { AdjustmentManager } from './components/Adjustments/AdjustmentManager';
import { DeliveryManager } from './components/Deliveries/DeliveryManager';
import { ReturnManager } from './components/Returns/ReturnManager';
import { WarehouseManager } from './components/Warehouse/WarehouseManager';
import { EmployeeManager } from './components/Employees/EmployeeManager';
import { ExpenseManager } from './components/Expenses/ExpenseManager';
import { ProductionManager } from './components/Production/ProductionManager';
import { SettingsAuditManager } from './components/Settings/SettingsAuditManager';
import { GlobalBackupBanner } from './components/common/GlobalBackupBanner';
import { VoiceAssistantModal } from './components/common/VoiceAssistantModal';
import { VoiceCommandResult } from './services/voiceService';
import { CustomerAccountService } from './services/accountService';
import { DocumentPrintModal, PrintDocType } from './components/Print/DocumentPrintModal';
import { DatabaseSetupModal } from './components/DatabaseSetupModal';
import { ShieldAlert, FileText, Receipt, FilePlus2, Users, Menu, Loader2, Database, Server } from 'lucide-react';

const getAccessibleTab = (user: User, preferredTab?: string): string => {
  if (preferredTab && preferredTab !== 'no_access' && StorageService.canAccessTab(preferredTab, user)) {
    return preferredTab;
  }
  const orderedTabs = [
    'dashboard',
    'orders',
    'invoices',
    'customers',
    'deliveries',
    'payments',
    'cheques',
    'adjustments',
    'returns',
    'warehouse',
    'production',
    'employees',
    'expenses',
    'settings',
  ];
  const found = orderedTabs.find((t) => StorageService.canAccessTab(t, user));
  return found || 'no_access';
};

function isUserEditingForm(): boolean {
  if (typeof document === 'undefined') return false;
  const activeEl = document.activeElement;
  if (!activeEl) return false;
  const tag = activeEl.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') {
    return true;
  }
  if ((activeEl as HTMLElement).isContentEditable) {
    return true;
  }
  return false;
}

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return StorageService.isAuthenticated();
  });
  const [currentUser, setCurrentUser] = useState<User>(() => {
    return StorageService.getActiveUser();
  });

  const [activeTab, setActiveTab] = useState<string>(() => {
    const active = StorageService.getActiveUser();
    return getAccessibleTab(active, 'orders');
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(undefined);
  const [deliveryInitialSearchQuery, setDeliveryInitialSearchQuery] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState<boolean>(false);
  const [settingsSubTab, setSettingsSubTab] = useState<'company' | 'users' | 'backup' | 'audit'>('company');

  // Startup Splash / Loading State
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [companySettings, setCompanySettings] = useState(() => StorageService.getSettings());

  // Print Modal State
  const [printDoc, setPrintDoc] = useState<{
    isOpen: boolean;
    type: PrintDocType;
    data: any;
  }>({
    isOpen: false,
    type: 'invoice',
    data: null,
  });

  // Badge Counts for Sidebar
  const [badgeCounts, setBadgeCounts] = useState<{
    draftOrders: number;
    activeInvoices: number;
    pendingDeliveries: number;
    pendingCheques: number;
  }>({
    draftOrders: 0,
    activeInvoices: 0,
    pendingDeliveries: 0,
    pendingCheques: 0,
  });

  // MySQL Host Database Setup Modal State & Real-time Sync Status
  const [isDbSetupModalOpen, setIsDbSetupModalOpen] = useState<boolean>(false);
  const [syncState, setSyncState] = useState(() => StorageService.getSyncStatus());

  useEffect(() => {
    const unsubSync = StorageService.onSyncStatusChange((s) => {
      setSyncState(s);
    });
    // Initial sync with host MySQL on app startup: wait for database so fresh data is shown immediately
    StorageService.syncWithServerOnStartup()
      .then(() => {
        setCompanySettings(StorageService.getCompanySettings());
        updateCounts();
        setIsInitialLoading(false);
      })
      .catch(() => {
        setIsInitialLoading(false);
      });
    setCompanySettings(StorageService.getCompanySettings());

    // Safety fallback timer so loading never hangs if connection is completely dead
    const splashTimer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 2200);

    const handlePermissionsChanged = () => {
      const active = StorageService.getActiveUser();
      setCurrentUser(active);
      setActiveTab((curr) => getAccessibleTab(active, curr));
      updateCounts();
    };

    const handleDbSynced = () => {
      const active = StorageService.getActiveUser();
      setCurrentUser(active);
      setCompanySettings(StorageService.getCompanySettings());
      updateCounts();
    };

    const handleFocusOrVisibilitySync = () => {
      // When user returns to tab, pull updates if not actively editing
      if (isUserEditingForm()) return;
      StorageService.pullFromHost().then((res) => {
        if (res.applied) {
          setCompanySettings(StorageService.getCompanySettings());
          updateCounts();
        }
      }).catch(() => {});
    };

    window.addEventListener('user-permissions-changed', handlePermissionsChanged);
    window.addEventListener('polyethylene-db-synced', handleDbSynced);
    window.addEventListener('polyethylene-settings-changed', handleDbSynced);
    window.addEventListener('focus', handleFocusOrVisibilitySync);
    document.addEventListener('visibilitychange', handleFocusOrVisibilitySync);

    // Periodic background sync at a smooth, non-disruptive rate (6s)
    const syncInterval = setInterval(() => {
      if (document.hidden || isUserEditingForm() || activeTab === 'new_order') return;
      StorageService.pullFromHost().then((res) => {
        if (res.applied) {
          updateCounts();
        }
      }).catch(() => {});
    }, 6000);

    return () => {
      window.removeEventListener('user-permissions-changed', handlePermissionsChanged);
      window.removeEventListener('polyethylene-db-synced', handleDbSynced);
      window.removeEventListener('polyethylene-settings-changed', handleDbSynced);
      window.removeEventListener('focus', handleFocusOrVisibilitySync);
      document.removeEventListener('visibilitychange', handleFocusOrVisibilitySync);
      clearInterval(syncInterval);
      unsubSync();
    };
  }, [activeTab]);

  // Synchronize with database on every tab/page change
  useEffect(() => {
    if (isAuthenticated) {
      StorageService.pullFromHost()
        .then(() => {
          updateCounts();
          setCompanySettings(StorageService.getCompanySettings());
        })
        .catch(() => {});
    }
  }, [activeTab, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      updateCounts();
    }
  }, [activeTab, isAuthenticated]);

  const updateCounts = () => {
    try {
      const orders = StorageService.getOrders() || [];
      const invoices = StorageService.getInvoices() || [];
      const cheques = StorageService.getCheques() || [];
      const customers = (StorageService.getCustomers() || []).filter((c) => c && c.id);
      const summaries = customers.map((c) =>
        StorageService.getCustomerAccountSummary(c.id)
      );

      const pendingDeliveriesCount = summaries.filter(
        (s) => s && s.pending_delivery_meters > 0
      ).length;

      setBadgeCounts({
        draftOrders: orders.filter((o) => o && o.status === 'draft').length,
        activeInvoices: invoices.filter((i) => i && i.status === 'active').length,
        pendingDeliveries: pendingDeliveriesCount,
        pendingCheques: cheques.filter((c) => c && c.status === 'pending').length,
      });
    } catch (e) {
      console.error('Error updating counts:', e);
    }
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setActiveTab(getAccessibleTab(user, 'orders'));
    updateCounts();
  };

  const handleLogout = () => {
    StorageService.logout();
    setIsAuthenticated(false);
  };

  const handleUserSwitch = (user: User) => {
    const freshUser = StorageService.getActiveUser();
    setCurrentUser(freshUser);
    setActiveTab((curr) => getAccessibleTab(freshUser, curr));
    updateCounts();
  };

  const handleNavigate = (tab: string, extraData?: any, subTab?: 'company' | 'users' | 'backup' | 'audit') => {
    if (tab === 'new_order') {
      if (!StorageService.hasPermission('orders.create', currentUser)) {
        alert('شما مجوز ثبت سفارش جدید را ندارید.');
        return;
      }
    } else if (!StorageService.canAccessTab(tab, currentUser)) {
      alert('شما مجوز دسترسی به این بخش را ندارید.');
      return;
    }
    if (tab === 'deliveries' && typeof extraData === 'string' && extraData.length > 2 && !extraData.match(/^[0-9a-fA-F-]{36}$/)) {
      setDeliveryInitialSearchQuery(extraData);
      setSelectedCustomerId(undefined);
    } else if (typeof extraData === 'string') {
      setSelectedCustomerId(extraData);
      setDeliveryInitialSearchQuery('');
    } else {
      setSelectedCustomerId(undefined);
      setDeliveryInitialSearchQuery('');
    }
    if (subTab) {
      setSettingsSubTab(subTab);
    } else if (tab === 'users') {
      setSettingsSubTab('users');
    } else if (tab === 'audit_logs') {
      setSettingsSubTab('audit');
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Pull latest data from host MySQL immediately upon switching views
    StorageService.pullFromHost().then((res) => {
      if (res.applied) {
        updateCounts();
      }
    }).catch(() => {});
  };

  const handleExecuteVoiceCommand = (result: VoiceCommandResult) => {
    if (
      result.action === 'OPEN_CUSTOMER_DOSSIER' ||
      (result.action as string) === 'OPEN_CUSTOMER_STATEMENT'
    ) {
      if (result.customerId) {
        handleNavigate('customers', result.customerId);
      }
    } else if (result.action === 'OPEN_CUSTOMER_DELIVERIES' && result.customerId) {
      handleNavigate('deliveries', result.customerId);
    } else if (result.action === 'SEARCH_DELIVERIES' && result.searchQuery) {
      handleNavigate('deliveries', result.searchQuery);
    } else if (result.action === 'PRINT_STATEMENT' && result.customerId) {
      const customer =
        result.customer ||
        StorageService.getCustomers().find((c) => c.id === result.customerId);
      if (customer) {
        const summ = StorageService.getCustomerAccountSummary(customer.id);
        const rawLedger = CustomerAccountService.getCustomerLedger(customer.id);
        handleOpenPrint('ledger', {
          customer_id: customer.id,
          customer_name: customer.name,
          customer_code: customer.code,
          summary: summ,
          transactions: rawLedger,
        });
      }
    } else if (result.action === 'DOWNLOAD_IMAGE_STATEMENT' && result.customerId) {
      const customer =
        result.customer ||
        StorageService.getCustomers().find((c) => c.id === result.customerId);
      if (customer) {
        const summ = StorageService.getCustomerAccountSummary(customer.id);
        const rawLedger = CustomerAccountService.getCustomerLedger(customer.id);
        handleOpenPrint('ledger', {
          customer_id: customer.id,
          customer_name: customer.name,
          customer_code: customer.code,
          summary: summ,
          transactions: rawLedger,
          autoDownloadImage: true,
        });
      }
    } else if (result.action === 'NAVIGATE' && result.targetTab) {
      handleNavigate(result.targetTab, undefined, result.subTab);
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'new_order':
        handleNavigate('orders');
        break;
      case 'new_payment':
        handleNavigate('payments');
        break;
      case 'new_delivery':
        handleNavigate('deliveries');
        break;
      case 'new_customer':
        handleNavigate('customers');
        break;
      default:
        break;
    }
  };

  const handleOpenPrint = (type: PrintDocType, data: any) => {
    setPrintDoc({
      isOpen: true,
      type,
      data,
    });
  };

  const handleClosePrint = () => {
    setPrintDoc({
      isOpen: false,
      type: 'invoice',
      data: null,
    });
  };

  // Startup Splash Screen (Logo, Company Name & Loading Animation)
  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-['Vazirmatn',sans-serif] text-white select-none">
        {/* Ambient Glows */}
        <div className="absolute w-96 h-96 bg-blue-600/15 rounded-full blur-3xl -top-20 -right-20 pointer-events-none" />
        <div className="absolute w-96 h-96 bg-sky-500/10 rounded-full blur-3xl -bottom-20 -left-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full animate-in fade-in zoom-in-95 duration-500">
          {/* Logo or High-Tech Emblem */}
          <div className="relative mb-6">
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 to-sky-400 rounded-3xl blur-md opacity-40 animate-pulse" />
            {companySettings.logo_url ? (
              <div className="relative p-3 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex items-center justify-center">
                <img
                  src={companySettings.logo_url}
                  alt="لوگوی شرکت"
                  className="h-16 w-auto max-w-[200px] object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-sky-500 flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-blue-500/30 ring-4 ring-white/10">
                PE
              </div>
            )}
          </div>

          {/* Company Title */}
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug mb-1.5">
            {companySettings.business_name || 'کارخانه تولید لوله پلی‌اتیلن البرز پایپ'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-semibold mb-8">
            {companySettings.brand_subtitle || 'سامانه جامع مدیریت هوشمند فروش، انبار و خطوط تولید'}
          </p>

          {/* Animated Loading Bar & Status */}
          <div className="w-64 sm:w-72 space-y-3">
            <div className="w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden relative p-[0.5px]">
              <div className="h-full bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-500 rounded-full animate-pulse w-full" />
            </div>
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-400">
              <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin" />
              <span>در حال بارگذاری و آماده‌سازی داده‌های سامانه...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated, display full LoginPage
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const safeUser = currentUser || StorageService.getActiveUser();

  return (
    <div className="min-h-screen bg-slate-100/90 dark:bg-slate-950 flex flex-col font-['Vazirmatn',sans-serif] text-slate-900 dark:text-slate-100 selection:bg-blue-600 selection:text-white print:min-h-0 print:bg-white transition-colors">
      {/* App Shell (Hidden completely during Print) */}
      <div className="no-print w-full flex flex-col flex-1">
        {/* Top Navigation Bar */}
        <Navbar
          currentUser={safeUser}
          onLogout={handleLogout}
          onNavigate={handleNavigate}
          onOpenVoiceAssistant={() => setIsVoiceAssistantOpen(true)}
          onOpenDatabaseSetup={() => setIsDbSetupModalOpen(true)}
          onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
          isMobileMenuOpen={isMobileMenuOpen}
        />

        {/* Main Application Body */}
        <div className="flex-1 flex w-full max-w-[1800px] mx-auto">
          {/* Sidebar (Desktop fixed & Mobile drawer) */}
          <Sidebar
            activeTab={activeTab}
            onSelectTab={(tab) => {
              handleNavigate(tab);
              setIsMobileMenuOpen(false);
            }}
            currentUser={safeUser}
            onLogout={handleLogout}
            onUserSwitch={handleUserSwitch}
            counts={badgeCounts}
            isMobileOpen={isMobileMenuOpen}
            onCloseMobile={() => setIsMobileMenuOpen(false)}
          />

          {/* Content View Container */}
          <main className="flex-1 px-2.5 py-3 sm:px-6 sm:py-6 lg:px-8 lg:py-7 min-w-0 w-full overflow-y-auto pb-24 md:pb-8">
            {/* Global Backup Reminder Alert Banner */}
            <GlobalBackupBanner onGoToBackup={() => handleNavigate('settings', undefined, 'backup')} />

            {!StorageService.canAccessTab(activeTab, safeUser) || activeTab === 'no_access' ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 border border-slate-200 dark:border-slate-800 text-center max-w-lg mx-auto mt-12 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center mb-5 shadow-xs">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white mb-2">
                  عدم دسترسی به این بخش
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                  شما مجوز لازم برای مشاهده یا فعالیت در این صفحه را ندارید. کلیه دسترسی‌های این بخش برای حساب کاربری «{safeUser?.name || 'کاربر سیستم'}» مسدود یا غیرفعال شده است.
                </p>
                {getAccessibleTab(safeUser) !== 'no_access' ? (
                  <button
                    onClick={() => handleNavigate(getAccessibleTab(safeUser))}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                  >
                    انتقال به بخش مجاز
                  </button>
                ) : (
                  <div className="text-xs font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-900/50">
                    حساب کاربری شما در حال حاضر فاقد هرگونه مجوز دسترسی به سیستم است. لطفاً با مدیر سیستم تماس بگیرید.
                  </div>
                )}
              </div>
            ) : (
              <>
                {activeTab === 'dashboard' && (
                  <DashboardView
                    onNavigate={handleNavigate}
                    onOpenNewOrder={() => handleNavigate('orders')}
                    onOpenNewPayment={() => handleNavigate('payments')}
                    onOpenNewDelivery={() => handleNavigate('deliveries')}
                  />
                )}

                {activeTab === 'customers' && (
                  <CustomerManager
                    initialCustomerId={selectedCustomerId}
                    onNavigate={handleNavigate}
                    onOpenOrderForCustomer={(cid) => handleNavigate('new_order', cid)}
                    onOpenPaymentForCustomer={(cid) => handleNavigate('payments', cid)}
                    onOpenAdjustmentForCustomer={(cid) => handleNavigate('adjustments', cid)}
                    onOpenDeliveryForCustomer={(cid) => handleNavigate('deliveries', cid)}
                    onPrintStatement={(customer, ledger) => {
                      const summ = StorageService.getCustomerAccountSummary(customer.id);
                      handleOpenPrint('ledger', {
                        customer_name: customer.name,
                        customer_code: customer.code,
                        summary: summ,
                        transactions: ledger,
                      });
                    }}
                  />
                )}

                {activeTab === 'products' && <ProductManager />}

                {activeTab === 'new_order' && (
                  <OrderForm
                    initialCustomerId={selectedCustomerId}
                    onSuccess={(order, invoice) => {
                      if (invoice) {
                        handleNavigate('invoices');
                      } else {
                        handleNavigate('orders');
                      }
                    }}
                    onCancel={() => handleNavigate('orders')}
                    onPrintProforma={(order) => handleOpenPrint('proforma', order)}
                  />
                )}

                {activeTab === 'orders' && (
                  <OrderManager
                    initialCustomerId={selectedCustomerId}
                    onNavigateToInvoices={() => handleNavigate('invoices')}
                    onPrintOrder={(order) => handleOpenPrint('proforma', order)}
                  />
                )}

                {activeTab === 'invoices' && (
                  <InvoiceManager
                    initialCustomerId={selectedCustomerId}
                    onPrintInvoice={(inv) => handleOpenPrint('invoice', inv)}
                  />
                )}

                {activeTab === 'payments' && (
                  <PaymentManager
                    initialCustomerId={selectedCustomerId}
                    onPrintReceipt={(p) => handleOpenPrint('payment', p)}
                  />
                )}

                {activeTab === 'cheques' && <ChequeManager />}

                {activeTab === 'adjustments' && (
                  <AdjustmentManager initialCustomerId={selectedCustomerId} />
                )}

                {activeTab === 'deliveries' && (
                  <DeliveryManager
                    initialCustomerId={selectedCustomerId}
                    initialSearchQuery={deliveryInitialSearchQuery}
                    onPrintDeliveryNote={(del) => handleOpenPrint('delivery', del)}
                  />
                )}

                {activeTab === 'returns' && (
                  <ReturnManager
                    initialCustomerId={selectedCustomerId}
                    onPrintReturnDoc={(ret) => handleOpenPrint('return', ret)}
                  />
                )}

                {activeTab === 'warehouse' && <WarehouseManager />}

                {activeTab === 'employees' && <EmployeeManager />}

                {activeTab === 'expenses' && (
                  <ExpenseManager
                    onPrintExpense={(exp) => handleOpenPrint('expense', exp)}
                  />
                )}

                {activeTab === 'production' && <ProductionManager />}

                {(activeTab === 'settings' || activeTab === 'audit_logs' || activeTab === 'users') && (
                  <SettingsAuditManager
                    initialSubTab={
                      activeTab === 'users'
                        ? 'users'
                        : activeTab === 'audit_logs'
                        ? 'audit'
                        : settingsSubTab
                    }
                  />
                )}
              </>
            )}
          </main>
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-lg select-none no-print pb-[env(safe-area-inset-bottom,0px)]">
          <div className="w-full max-w-lg mx-auto flex items-center justify-around py-1.5 px-3">
            {/* 1. Full Menu (on the far right in RTL) */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 active:scale-95 transition cursor-pointer"
            >
              <Menu className="w-5 h-5" />
              <span className="text-[10px] mt-0.5 font-bold">منو</span>
            </button>

            {/* 2. Orders */}
            <button
              type="button"
              onClick={() => handleNavigate('orders')}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition cursor-pointer relative ${
                activeTab === 'orders'
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">سفارش‌ها</span>
              {badgeCounts.draftOrders > 0 && (
                <span className="absolute top-0 right-1/2 translate-x-3 w-2 h-2 rounded-full bg-blue-600"></span>
              )}
            </button>

            {/* 3. Floating Quick New Action (Centered) */}
            <div className="flex-1 flex items-center justify-center">
              <button
                type="button"
                onClick={() => handleNavigate('new_order')}
                className="flex items-center justify-center -mt-5 bg-blue-600 hover:bg-blue-700 text-white w-12 h-12 rounded-2xl shadow-lg shadow-blue-500/30 transition-transform active:scale-95 cursor-pointer"
                title="ثبت سفارش جدید"
              >
                <FilePlus2 className="w-6 h-6" />
              </button>
            </div>

            {/* 4. Invoices */}
            <button
              type="button"
              onClick={() => handleNavigate('invoices')}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition cursor-pointer relative ${
                activeTab === 'invoices'
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Receipt className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">فاکتورها</span>
              {badgeCounts.activeInvoices > 0 && (
                <span className="absolute top-0 right-1/2 translate-x-3 w-2 h-2 rounded-full bg-emerald-600"></span>
              )}
            </button>

            {/* 5. Customers (on the far left in RTL) */}
            <button
              type="button"
              onClick={() => handleNavigate('customers')}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition cursor-pointer ${
                activeTab === 'customers'
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">مشتریان</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Global Document Print Modal */}
      {printDoc.isOpen && printDoc.data && (
        <DocumentPrintModal
          type={printDoc.type}
          data={printDoc.data}
          onClose={handleClosePrint}
        />
      )}

      {/* Voice Assistant Modal */}
      <VoiceAssistantModal
        isOpen={isVoiceAssistantOpen}
        onClose={() => setIsVoiceAssistantOpen(false)}
        onExecuteCommand={handleExecuteVoiceCommand}
      />

      {/* MySQL Host Database Setup & Configuration Modal */}
      <DatabaseSetupModal
        isOpen={isDbSetupModalOpen}
        onClose={() => setIsDbSetupModalOpen(false)}
        onSuccess={() => {
          updateCounts();
          StorageService.pullFromHost().catch(() => {});
        }}
      />
    </div>
  );
}
