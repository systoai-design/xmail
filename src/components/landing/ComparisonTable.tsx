import { Check, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export const ComparisonTable = () => {
  const [visibleRows, setVisibleRows] = useState<number[]>([]);

  useEffect(() => {
    const delays = [0, 100, 200, 300, 400, 500, 600, 700];
    delays.forEach((delay, index) => {
      setTimeout(() => {
        setVisibleRows(prev => [...prev, index]);
      }, delay);
    });
  }, []);

  const features = [
    { name: 'End-to-End Encryption', xmail: true, gmail: false, outlook: false, yahoo: false },
    { name: 'Zero Knowledge Privacy', xmail: true, gmail: false, outlook: false, yahoo: false },
    { name: 'No Email Required', xmail: true, gmail: false, outlook: false, yahoo: false },
    { name: 'Blockchain Verified', xmail: true, gmail: false, outlook: false, yahoo: false },
    { name: 'Spam Protection (Micropayment)', xmail: true, gmail: false, outlook: false, yahoo: false },
    { name: 'No Data Collection', xmail: true, gmail: false, outlook: false, yahoo: false },
    { name: 'Decentralized', xmail: true, gmail: false, outlook: false, yahoo: false },
    { name: 'Military-Grade Security', xmail: true, gmail: false, outlook: false, yahoo: false },
  ];

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-primary/30">
            <th className="text-left p-4 md:p-6">
              <span className="text-lg md:text-xl font-bold text-foreground">Feature</span>
            </th>
            <th className="p-4 md:p-6">
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-2xl font-black text-primary">X</span>
                </div>
                <span className="text-sm md:text-base font-bold text-primary">XMail</span>
              </div>
            </th>
            <th className="p-4 md:p-6">
              <div className="flex flex-col items-center gap-2">
                <div className="text-sm md:text-base font-semibold text-muted-foreground">Gmail</div>
              </div>
            </th>
            <th className="p-4 md:p-6 hidden md:table-cell">
              <div className="flex flex-col items-center gap-2">
                <div className="text-sm md:text-base font-semibold text-muted-foreground">Outlook</div>
              </div>
            </th>
            <th className="p-4 md:p-6 hidden lg:table-cell">
              <div className="flex flex-col items-center gap-2">
                <div className="text-sm md:text-base font-semibold text-muted-foreground">Yahoo</div>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {features.map((feature, index) => (
            <tr
              key={feature.name}
              className={`border-b border-border/50 transition-all duration-500 ${
                visibleRows.includes(index) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <td className="p-4 md:p-6">
                <span className="text-sm md:text-base font-medium text-foreground">{feature.name}</span>
              </td>
              <td className="p-4 md:p-6 text-center">
                {feature.xmail ? (
                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-success/20 animate-checkmark">
                    <Check className="w-5 h-5 text-success animate-scale-in" style={{ animationDelay: `${index * 100}ms` }} />
                  </div>
                ) : (
                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-destructive/20">
                    <X className="w-5 h-5 text-destructive" />
                  </div>
                )}
              </td>
              <td className="p-4 md:p-6 text-center">
                {feature.gmail ? (
                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-success/20">
                    <Check className="w-5 h-5 text-success" />
                  </div>
                ) : (
                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted/20">
                    <X className="w-5 h-5 text-muted-foreground/50" />
                  </div>
                )}
              </td>
              <td className="p-4 md:p-6 text-center hidden md:table-cell">
                {feature.outlook ? (
                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-success/20">
                    <Check className="w-5 h-5 text-success" />
                  </div>
                ) : (
                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted/20">
                    <X className="w-5 h-5 text-muted-foreground/50" />
                  </div>
                )}
              </td>
              <td className="p-4 md:p-6 text-center hidden lg:table-cell">
                {feature.yahoo ? (
                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-success/20">
                    <Check className="w-5 h-5 text-success" />
                  </div>
                ) : (
                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted/20">
                    <X className="w-5 h-5 text-muted-foreground/50" />
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
