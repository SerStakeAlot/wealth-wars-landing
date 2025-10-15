import { FC } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export const ConnectWallet: FC = () => {
  return (
    <div className="inline-flex">
      <WalletMultiButton className="btn btn-outline" />
    </div>
  );
};

export default ConnectWallet;
