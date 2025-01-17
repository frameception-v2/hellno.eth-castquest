"use client";

import { useEffect, useCallback, useState } from "react";
import sdk, {
  AddFrame,
  SignIn as SignInCore,
  type Context,
} from "@farcaster/frame-sdk";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "~/components/ui/card";
import { toast } from "~/components/ui/use-toast";

import { config } from "~/components/providers/WagmiProvider";
import { PurpleButton } from "~/components/ui/PurpleButton";
import { truncateAddress } from "~/lib/truncateAddress";
import { base, optimism } from "wagmi/chains";
import { useSession } from "next-auth/react";
import { createStore } from "mipd";
import { Label } from "~/components/ui/label";
import { PROJECT_TITLE } from "~/lib/constants";

function ExampleCard() {
  return (
    <Card className="border-neutral-200 bg-white">
      <CardHeader>
        <CardTitle className="text-neutral-900">Welcome to the Frame Template</CardTitle>
        <CardDescription className="text-neutral-600">
          This is an example card that you can customize or remove
        </CardDescription>
      </CardHeader>
      <CardContent className="text-neutral-800">
        <p>
          Your frame content goes here. The text is intentionally dark to ensure good readability.
        </p>
      </CardContent>
    </Card>
  );
}

export default function Frame(
  { title }: { title?: string } = { title: PROJECT_TITLE }
) {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<Context.FrameContext>();

  const [added, setAdded] = useState(false);

  const [addFrameResult, setAddFrameResult] = useState("");
  const [notificationStatus, setNotificationStatus] = useState<'enabled'|'disabled'|'unknown'>('unknown');

  const addFrame = useCallback(async () => {
    try {
      await sdk.actions.addFrame();
      toast({
        title: "Frame Added",
        description: "This frame has been successfully added to your Warpcast client",
      });
    } catch (error) {
      let errorMessage = "An error occurred";
      if (error instanceof AddFrame.RejectedByUser) {
        errorMessage = `Not added: ${error.message}`;
      } else if (error instanceof AddFrame.InvalidDomainManifest) {
        errorMessage = `Not added: ${error.message}`;
      }
      
      setAddFrameResult(errorMessage);
      toast({
        title: "Frame Add Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, []);

  const checkNotifications = useCallback(async () => {
    try {
      const status = await sdk.actions.getNotificationStatus();
      setNotificationStatus(status);
      if (status === 'enabled') {
        toast({
          title: "Notifications Enabled",
          description: "You'll receive updates from this frame",
        });
      }
    } catch (error) {
      console.error("Failed to check notification status:", error);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      const context = await sdk.context;
      if (!context) {
        return;
      }

      setContext(context);
      setAdded(context.client.added);

      // If frame isn't already added, prompt user to add it
      if (!context.client.added) {
        addFrame();
      }

      sdk.on("frameAdded", ({ notificationDetails }) => {
        setAdded(true);
      });

      sdk.on("frameAddRejected", ({ reason }) => {
        console.log("frameAddRejected", reason);
      });

      sdk.on("frameRemoved", () => {
        console.log("frameRemoved");
        setAdded(false);
      });

      sdk.on("notificationsEnabled", ({ notificationDetails }) => {
        console.log("notificationsEnabled", notificationDetails);
        setNotificationStatus('enabled');
        toast({
          title: "Notifications Enabled",
          description: "You'll receive updates from this frame",
        });
      });
      sdk.on("notificationsDisabled", () => {
        console.log("notificationsDisabled");
        setNotificationStatus('disabled');
        toast({
          title: "Notifications Disabled",
          description: "You won't receive updates from this frame",
          variant: "destructive",
        });
      });

      // Check initial notification status
      checkNotifications();

      sdk.on("primaryButtonClicked", () => {
        console.log("primaryButtonClicked");
      });

      console.log("Calling ready");
      sdk.actions.ready({});

      // Set up a MIPD Store, and request Providers.
      const store = createStore();

      // Subscribe to the MIPD Store.
      store.subscribe((providerDetails) => {
        console.log("PROVIDER DETAILS", providerDetails);
        // => [EIP6963ProviderDetail, EIP6963ProviderDetail, ...]
      });
    };
    if (sdk && !isSDKLoaded) {
      console.log("Calling load");
      setIsSDKLoaded(true);
      load();
      return () => {
        sdk.removeAllListeners();
      };
    }
  }, [isSDKLoaded, addFrame]);

  if (!isSDKLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div
      style={{
        paddingTop: context?.client.safeAreaInsets?.top ?? 0,
        paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
        paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
        paddingRight: context?.client.safeAreaInsets?.right ?? 0,
      }}
    >
      <div className="w-[300px] mx-auto py-2 px-2">
        <h1 className="text-2xl font-bold text-center mb-4 text-neutral-900">{title}</h1>
        <ExampleCard />
        
        <div className="mt-4 space-y-2">
          <Label>Notifications: {notificationStatus === 'enabled' ? '✅ Enabled' : '❌ Disabled'}</Label>
          <PurpleButton 
            onClick={() => sdk.actions.enableNotifications()} 
            disabled={notificationStatus === 'enabled'}
          >
            Enable Notifications
          </PurpleButton>
        </div>
      </div>
    </div>
  );
}
