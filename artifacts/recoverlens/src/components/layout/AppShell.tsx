import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useLocale } from '@/lib/locale';
import { Activity, LayoutDashboard, Stethoscope, Dumbbell, HeartHandshake, Globe, LogOut, Menu, UserRound, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useRecoverLensAuth } from '@/lib/auth';

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { language, setLanguage, t } = useLocale();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, roles, patientIds, selectedPatientId, setSelectedPatientId, logout } = useRecoverLensAuth();
  
  // Do not render shell for mirror - it's full screen
  if (location.startsWith('/mirror')) {
    return <>{children}</>;
  }

  const navItems = [
    { path: '/', label: t('nav.home') || 'Home', icon: Activity, roles: ['patient', 'caregiver', 'clinician', 'coach'] },
    { path: '/caregiver', label: t('nav.caregiver') || 'Caregiver', icon: HeartHandshake, roles: ['caregiver'] },
    { path: '/sports', label: t('nav.sports') || 'Sports', icon: Dumbbell, roles: ['coach'] },
    { path: '/clinician', label: t('nav.clinician') || 'Clinician', icon: Stethoscope, roles: ['clinician'] },
    { path: '/coach', label: t('nav.coach') || 'Coach', icon: LayoutDashboard, roles: ['coach'] },
  ].filter((item) => item.roles.some((itemRole) => roles.some((role) => role === itemRole)));

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Account';

  return (
    <div className="min-h-[100dvh] flex w-full bg-muted/30">
      {/* Sidebar Navigation */}
      <aside className="w-64 flex-col hidden md:flex border-r bg-card h-screen sticky top-0 shrink-0">
        <div className="h-16 flex items-center px-6 border-b">
          <Activity className="h-6 w-6 text-primary mr-2" />
          <span className="font-bold text-lg tracking-tight">RecoverLens</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const active = location === item.path || (item.path !== '/' && location.startsWith(item.path));
            return (
              <Link key={item.path} href={item.path} className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary/80 hover:text-foreground'}`}>
                <item.icon className={`h-5 w-5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="mb-2 w-full justify-start" data-testid="button-account-menu">
                <UserRound className="h-4 w-4 mr-2" />
                <span className="truncate">{displayName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[220px]">
              <DropdownMenuItem disabled data-testid="text-account-role">{roles.length ? roles.map((role) => `${role[0].toUpperCase()}${role.slice(1)}`).join(', ') : 'Access pending'}</DropdownMenuItem>
              <DropdownMenuItem onClick={logout} data-testid="button-logout"><LogOut className="h-4 w-4 mr-2" />Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {patientIds.length > 1 && (
            <select
              className="mb-2 h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={selectedPatientId ?? ''}
              onChange={(event) => setSelectedPatientId(event.target.value)}
              data-testid="select-active-patient"
              aria-label="Active patient"
            >
              {patientIds.map((patientId) => <option key={patientId} value={patientId}>{patientId}</option>)}
            </select>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <div className="flex items-center">
                  <Globe className="h-4 w-4 mr-2" />
                  {language === 'en' ? 'English' : language === 'sn' ? 'Shona' : 'Ndebele'}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuItem onClick={() => setLanguage('en')}>English</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage('sn')}>Shona</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage('nd')}>Ndebele</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-[100dvh] max-w-full overflow-hidden">
        {/* Mobile Header */}
        <header className="h-16 flex items-center justify-between px-4 border-b bg-card md:hidden sticky top-0 z-30">
          <div className="flex items-center">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="mr-2 -ml-2 text-muted-foreground">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
                <SheetHeader className="h-16 border-b px-6 flex items-center justify-center m-0">
                  <div className="flex items-center w-full">
                    <Activity className="h-6 w-6 text-primary mr-2" />
                    <SheetTitle className="font-bold text-lg tracking-tight m-0">RecoverLens</SheetTitle>
                  </div>
                </SheetHeader>
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                  {navItems.map((item) => {
                    const active = location === item.path || (item.path !== '/' && location.startsWith(item.path));
                    return (
                      <Link key={item.path} href={item.path} onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-3 px-3 py-3 rounded-md transition-colors text-base font-medium ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary/80 hover:text-foreground'}`}>
                        <item.icon className={`h-5 w-5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
                <div className="p-4 border-t">
                  <Button variant="ghost" className="mb-2 w-full justify-start" onClick={logout} data-testid="button-mobile-logout">
                    <LogOut className="h-4 w-4 mr-2" /> Log out
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        <div className="flex items-center">
                          <Globe className="h-4 w-4 mr-2" />
                          {language === 'en' ? 'English' : language === 'sn' ? 'Shona' : 'Ndebele'}
                        </div>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-full">
                      <DropdownMenuItem onClick={() => { setLanguage('en'); setMobileMenuOpen(false); }}>English</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setLanguage('sn'); setMobileMenuOpen(false); }}>Shona</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setLanguage('nd'); setMobileMenuOpen(false); }}>Ndebele</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </SheetContent>
            </Sheet>
            <Activity className="h-5 w-5 text-primary mr-2" />
            <span className="font-bold">RecoverLens</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="button-mobile-account">
                <UserRound className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled>{displayName}</DropdownMenuItem>
              <DropdownMenuItem onClick={logout} data-testid="button-header-logout"><LogOut className="h-4 w-4 mr-2" />Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <div className="flex-1 p-4 md:p-8 overflow-y-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
