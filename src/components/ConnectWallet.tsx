import { FC } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const ConnectWallet: FC = () => {
  return (
    <div className="inline-flex">
      <WalletMultiButton className="!bg-accent !text-accent-foreground hover:!bg-accent/90 !transition-colors !rounded-md !h-10 !px-4 !py-2 !text-sm !font-medium" />
    </div>
  );
};

export default ConnectWallet;
