import React from 'react';
import { StorageService } from '../../services/storageService';
import { toPersianDigits } from '../../utils/jalali';
import { MapPin, Phone, Mail, Globe } from 'lucide-react';

export const PrintFooter: React.FC = () => {
  const company = StorageService.getCompanySettings() as any;
  const address = company.address || '';
  const phone = company.phone || company.mobile || '';
  const email = company.email || '';
  const website = company.website || '';

  if (!address && !phone && !email && !website) {
    return null;
  }

  return (
    <div className="mt-auto pt-3 border-t border-slate-300 text-[9.5px] text-slate-600 font-medium flex flex-wrap items-center justify-between gap-2 bg-white print:bg-white w-full">
      {address && (
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
          <span>{address}</span>
        </div>
      )}
      <div className="flex items-center gap-4">
        {phone && (
          <div className="flex items-center gap-1">
            <Phone className="w-3 h-3 text-slate-500 shrink-0" />
            <span className="font-mono">{toPersianDigits(phone)}</span>
          </div>
        )}
        {email && (
          <div className="flex items-center gap-1">
            <Mail className="w-3 h-3 text-slate-500 shrink-0" />
            <span>{email}</span>
          </div>
        )}
        {website && (
          <div className="flex items-center gap-1">
            <Globe className="w-3 h-3 text-slate-500 shrink-0" />
            <span>{website}</span>
          </div>
        )}
      </div>
    </div>
  );
};
