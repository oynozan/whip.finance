"use client";

import {
    Upload,
    PlusCircleIcon,
    Loader2,
    ArrowLeft,
    LucideIcon,
    ImportIcon,
    CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useState, ReactNode } from "react";
import { useWindowStore } from "@/store/windowStore";
import { useLogsStore } from "@/store/logsStore";
import { useWalletClient } from "wagmi";
import { type WalletClient as ViemWalletClient } from "viem";
import { setupStoryClient, registerIp, registerDerivativeIp } from "@/lib/storyProtocol";
import { useRouter } from "next/navigation";

interface AssetFormData {
    name: string;
    ticker: string;
    description: string;
    image: File | null;
    imagePreview: string;
    parentIpId?: string; // For derivative assets
}

interface UploadedNFTData {
    nftId: string;
    imageIpfsHash: string;
    metadataIpfsHash: string;
    metadataHash: string; // hex without 0x
    imageUrl: string;
    metadataUrl: string;
}

interface InfoSection {
    title: string;
    content: ReactNode;
}

export default function CreateIPWindow() {
    const { closeWindow } = useWindowStore();
    const { addLog } = useLogsStore();
    const { data: walletClient } = useWalletClient();
    const router = useRouter();

    // Check for pre-filled parent IP ID from session storage
    const [prefilledParentIpId] = useState(() => {
        if (typeof window !== "undefined") {
            const parentIpId = sessionStorage.getItem("derivative_parent_ip");
            if (parentIpId) {
                sessionStorage.removeItem("derivative_parent_ip");
                return parentIpId;
            }
        }
        return null;
    });

    const [step, setStep] = useState(1);
    const [assetType, setAssetType] = useState<"mint" | "derivative" | null>(
        prefilledParentIpId ? "derivative" : null,
    );
    const [formData, setFormData] = useState<AssetFormData>({
        name: "",
        ticker: "",
        description: "",
        image: null,
        imagePreview: "",
        parentIpId: prefilledParentIpId || "",
    });
    const [uploadedData, setUploadedData] = useState<UploadedNFTData | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData(prev => ({
                ...prev,
                image: file,
                imagePreview: URL.createObjectURL(file),
            }));
        }
    };

    const handleFormChange = (data: Partial<AssetFormData>) => {
        setFormData(prev => ({ ...prev, ...data }));
    };

    const handleSubmitForm = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (!formData.image) {
                toast.error("Please select an image");
                return;
            }

            setIsProcessing(true);

            const uploadFormData = new FormData();
            uploadFormData.append("name", formData.name);
            uploadFormData.append("ticker", formData.ticker);
            uploadFormData.append("description", formData.description);
            uploadFormData.append("image", formData.image);

            const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER}/nft/upload-metadata`, {
                method: "POST",
                body: uploadFormData,
            });

            if (!response.ok) {
                throw new Error("Failed to upload metadata");
            }

            const result = await response.json();

            setUploadedData({
                nftId: result.nftId,
                imageIpfsHash: result.imageIpfsHash,
                metadataIpfsHash: result.metadataIpfsHash,
                metadataHash: result.metadataHash,
                imageUrl: result.imageUrl,
                metadataUrl: result.metadataUrl,
            });

            addLog(
                `Uploaded metadata: ${formData.name} (${formData.ticker}) | metadataHash: ${result.metadataHash}`,
            );

            toast.success("Metadata uploaded successfully!");
            setStep(2);
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Failed to upload metadata. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRegisterAsset = async () => {
        setIsProcessing(true);
        try {
            // Ensure wallet client is available
            if (!walletClient) {
                toast.error("Please connect your wallet to register");
                setIsProcessing(false);
                return;
            }

            if (!uploadedData) {
                toast.error("Please upload metadata first");
                setIsProcessing(false);
                return;
            }

            // For derivative assets, validate parent IP ID
            if (assetType === "derivative" && !formData.parentIpId) {
                toast.error("Parent IP ID is required for derivative assets");
                setIsProcessing(false);
                return;
            }

            const metadataURI = uploadedData.metadataUrl;
            const metadataHash =
                `0x${uploadedData.metadataHash.replace(/^0x/, "")}` as `0x${string}`;

            // Create Story client
            const client = await setupStoryClient(walletClient as ViemWalletClient);

            // Register IP based on type
            let txHash: `0x${string}`;
            let ipId: string;

            if (assetType === "derivative") {
                const response = await registerDerivativeIp(
                    client,
                    metadataURI,
                    metadataHash,
                    formData.parentIpId!,
                );
                txHash = response.txHash;
                ipId = response.ipId;
            } else {
                const response = await registerIp(client, metadataURI, metadataHash);
                txHash = response.txHash;
                ipId = response.ipId;
            }

            // Validate asset
            const result = await fetch(`${process.env.NEXT_PUBLIC_SERVER}/ip/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    type: assetType === "derivative" ? "derivative" : "new_minted",
                    nftId: uploadedData.nftId,
                    ipId: ipId,
                    tx: txHash,
                    wallet: walletClient.account.address,
                    parentIpId: assetType === "derivative" ? formData.parentIpId : undefined,
                }),
            });

            if (!result.ok) {
                toast.error("Failed to validate asset");
                console.error("Failed to validate asset:", result);
                return;
            }

            const resultData = await result.json();

            if (!resultData.success) {
                toast.error(resultData.error);
                return;
            }

            // Log details to logs panel
            const assetTypeLabel = assetType === "derivative" ? "Derivative IP" : "IP";
            addLog(
                `Registered ${assetTypeLabel}: ${formData.name} (${formData.ticker}) | tx: ${txHash} | ipId: ${ipId}`,
            );

            toast.success("Asset registered successfully!");
            closeWindow("create-ip");
            router.push(`/ip/${ipId}`);
        } catch (error) {
            console.error("Registration error:", error);
            toast.error("Failed to register asset. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (!assetType) {
        return <AssetTypeSelection onSelectType={setAssetType} />;
    }

    if (step === 1) {
        return (
            <AssetDetailsStep
                formData={formData}
                isProcessing={isProcessing}
                onFormChange={handleFormChange}
                onImageUpload={handleImageUpload}
                onSubmit={handleSubmitForm}
                onBack={() => setAssetType(null)}
                isDerivative={assetType === "derivative"}
            />
        );
    }

    if (step === 2) {
        return (
            <RegisterAssetStep
                formData={formData}
                isProcessing={isProcessing}
                onRegister={handleRegisterAsset}
                onBack={() => setStep(1)}
            />
        );
    }

    return null;
}

function AssetTypeSelection({
    onSelectType,
}: {
    onSelectType: (type: "mint" | "derivative") => void;
}) {
    const infoSections: InfoSection[] = [
        {
            title: "How does it work?",
            content:
                "Mint or derive your IP and give whip.finance a 10% royalty. Then your IP will be listed on the trenches for others to trade. You earn fees from each buy & sell. Also, your asset will be derivable for others to create their own derivative IP.",
        },
        {
            title: "ELI5",
            content:
                "Mint or derive IP, earn fee from each trade. Let others derive your IP and earn fees from their trades too.",
        },
    ];

    return (
        <div className="w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <InfoPanel title="Take your place in the trenches" sections={infoSections} />
                <div className="flex flex-col justify-between">
                    <h3 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6">
                        Choose Asset Type
                    </h3>
                    <AssetTypeCard
                        Icon={PlusCircleIcon}
                        title="Mint New Asset"
                        description="Mint and register new IP"
                        onClick={() => onSelectType("mint")}
                    />
                    <AssetTypeCard
                        Icon={ImportIcon}
                        title="Derivative Asset"
                        description="Create a derivative IP based on existing IP"
                        onClick={() => onSelectType("derivative")}
                    />
                </div>
            </div>
        </div>
    );
}

function AssetDetailsStep({
    formData,
    isProcessing,
    onFormChange,
    onImageUpload,
    onSubmit,
    onBack,
    isDerivative,
}: {
    formData: AssetFormData;
    isProcessing: boolean;
    onFormChange: (data: Partial<AssetFormData>) => void;
    onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSubmit: (e: React.FormEvent) => void;
    onBack: () => void;
    isDerivative?: boolean;
}) {
    const infoSections: InfoSection[] = [
        {
            title: isDerivative ? "Derivative Asset Information" : "Asset Information",
            content: isDerivative
                ? "Create a derivative based on an existing IP asset. Your derivative inherits from the parent IP."
                : "Provide the basic details about your intellectual property asset.",
        },
        {
            title: "Tips",
            content: (
                <InfoList
                    items={
                        isDerivative
                            ? [
                                  "Ensure parent IP ID is valid",
                                  "Choose a descriptive name for your derivative",
                                  "Ticker should be 1-16 characters",
                                  "High-quality images work best",
                              ]
                            : [
                                  "Choose a clear, descriptive name",
                                  "Ticker should be 1-16 characters",
                                  "Description helps others understand your IP",
                                  "High-quality images work best",
                              ]
                    }
                />
            ),
        },
    ];

    return (
        <StepLayout infoPanel={<InfoPanel title="Step 1: Asset Details" sections={infoSections} />}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold">Enter Asset Details</h3>
                <BackButton onClick={onBack} label="Back" />
            </div>
            <form onSubmit={onSubmit} className="space-y-3 sm:space-y-4">
                {isDerivative && (
                    <FormField label="Parent IP ID">
                        <TextInput
                            value={formData.parentIpId || ""}
                            onChange={value => onFormChange({ parentIpId: value })}
                            placeholder="0x..."
                            required
                        />
                    </FormField>
                )}

                <FormField label="Asset Name">
                    <TextInput
                        value={formData.name}
                        onChange={value => onFormChange({ name: value })}
                        placeholder="My Awesome IP"
                        required
                    />
                </FormField>

                <FormField label="Asset Ticker">
                    <TextInput
                        value={formData.ticker}
                        onChange={value => onFormChange({ ticker: value.toUpperCase() })}
                        placeholder="MYIP"
                        maxLength={16}
                        required
                    />
                </FormField>

                <FormField label="Description">
                    <TextArea
                        value={formData.description}
                        onChange={value => onFormChange({ description: value })}
                        placeholder="Describe your intellectual property..."
                        required
                    />
                </FormField>

                <FormField label="Asset Image">
                    <ImageUpload
                        imagePreview={formData.imagePreview}
                        onUpload={onImageUpload}
                        required
                    />
                </FormField>

                <ActionButton
                    type="submit"
                    isLoading={isProcessing}
                    loadingText="Uploading metadata..."
                >
                    Continue
                </ActionButton>
            </form>
        </StepLayout>
    );
}

function RegisterAssetStep({
    formData,
    isProcessing,
    onRegister,
    onBack,
}: {
    formData: AssetFormData;
    isProcessing: boolean;
    onRegister: () => void;
    onBack: () => void;
}) {
    const infoSections: InfoSection[] = [
        {
            title: "Register Asset",
            content:
                "We will register your IP on-chain and mint the NFT in one step. Review the details before confirming.",
        },
        {
            title: "What Happens",
            content: (
                <InfoList
                    items={[
                        "NFT minted and registered on-chain",
                        "Your IP will be listed on the trenches for others to trade",
                        "You earn fees from each buy & sell",
                        "Others can derive your IP and earn fees from their trades too",
                    ]}
                />
            ),
        },
    ];

    return (
        <StepLayout
            infoPanel={<InfoPanel title="Step 2: Register Asset" sections={infoSections} />}
        >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold">Review & Confirm</h3>
                <BackButton onClick={onBack} label="Back" />
            </div>

            <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                {formData.imagePreview && (
                    <div className="flex justify-center">
                        <img
                            src={formData.imagePreview}
                            alt={formData.name}
                            className="max-h-48 rounded-lg"
                        />
                    </div>
                )}

                <div className="space-y-3">
                    <DetailCard label="Asset Name">{formData.name}</DetailCard>
                    <DetailCard label="Ticker">{formData.ticker}</DetailCard>
                    <DetailCard label="Description">
                        <span className="text-sm text-secondary-text font-normal">
                            {formData.description}
                        </span>
                    </DetailCard>
                </div>
            </div>

            <ActionButton
                onClick={onRegister}
                isLoading={isProcessing}
                loadingText="Registering asset..."
            >
                Register Asset
            </ActionButton>
        </StepLayout>
    );
}

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
    return (
        <div>
            <button
                onClick={onClick}
                className="flex items-center gap-2 text-sm text-secondary-text hover:text-foreground transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                {label}
            </button>
        </div>
    );
}

function InfoPanel({ title, sections }: { title: string; sections: InfoSection[] }) {
    return (
        <div className="rounded-lg p-[2px] bg-gradient-to-br from-white/20 to-white/10 relative">
            <div className="bg-background backdrop-blur-sm rounded-lg p-4 sm:p-6 h-full">
                <h3 className="text-base sm:text-xl font-bold mb-3 sm:mb-4">{title}</h3>
                <div className="space-y-3 sm:space-y-4 text-xs sm:text-sm">
                    {sections.map((section, idx) => (
                        <div key={idx}>
                            <h4 className="font-semibold mb-2">{section.title}</h4>
                            <div className="text-foreground/80">{section.content}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function StepLayout({
    backButton,
    infoPanel,
    children,
}: {
    backButton?: ReactNode;
    infoPanel: ReactNode;
    children: ReactNode;
}) {
    return (
        <div className="w-full">
            {backButton}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {infoPanel}
                <div>{children}</div>
            </div>
        </div>
    );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div>
            <label className="block text-xs sm:text-sm font-medium mb-2">{label}</label>
            {children}
        </div>
    );
}

function TextInput({
    value,
    onChange,
    placeholder,
    maxLength,
    required,
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    maxLength?: number;
    required?: boolean;
}) {
    return (
        <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full px-4 py-2 bg-secondary-bg border border-border-subtle rounded-lg focus:outline-none focus:border-positive transition-colors"
            placeholder={placeholder}
            maxLength={maxLength}
            required={required}
        />
    );
}

function TextArea({
    value,
    onChange,
    placeholder,
    rows = 4,
    required,
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    rows?: number;
    required?: boolean;
}) {
    return (
        <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full px-4 py-2 bg-secondary-bg border border-border-subtle rounded-lg focus:outline-none focus:border-positive transition-colors resize-none"
            placeholder={placeholder}
            rows={rows}
            required={required}
        />
    );
}

function ImageUpload({
    imagePreview,
    onUpload,
    required,
}: {
    imagePreview: string;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    required?: boolean;
}) {
    return (
        <div className="border-2 border-dashed border-border-subtle rounded-lg p-6 text-center hover:border-positive transition-colors cursor-pointer">
            <input
                type="file"
                accept="image/*"
                onChange={onUpload}
                className="hidden"
                id="image-upload"
                required={required}
            />
            <label htmlFor="image-upload" className="cursor-pointer">
                {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="max-h-32 mx-auto rounded" />
                ) : (
                    <div className="space-y-2">
                        <Upload className="w-8 h-8 mx-auto text-muted-text" />
                        <p className="text-sm text-secondary-text">Click to upload image</p>
                    </div>
                )}
            </label>
        </div>
    );
}

function ActionButton({
    onClick,
    isLoading,
    loadingText,
    children,
    type = "button",
    disabled,
}: {
    onClick?: () => void;
    isLoading?: boolean;
    loadingText?: string;
    children: ReactNode;
    type?: "button" | "submit";
    disabled?: boolean;
}) {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (type === "button" && onClick) {
            e.preventDefault();
            e.stopPropagation();
            onClick();
        }
    };

    return (
        <button
            type={type}
            onClick={type === "button" ? handleClick : onClick}
            disabled={isLoading || disabled}
            className="w-full px-4 py-3 bg-primary text-background rounded-lg font-medium hover:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
            {isLoading ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {loadingText}
                </>
            ) : (
                children
            )}
        </button>
    );
}

function DetailCard({
    label,
    children,
    mono,
}: {
    label: string;
    children: ReactNode;
    mono?: boolean;
}) {
    return (
        <div className="p-4 bg-card-bg border border-border-subtle rounded-lg break-all">
            <p className="text-xs text-muted-text mb-1">{label}</p>
            <p className={`${mono ? "font-mono text-sm" : "font-semibold"}`}>{children}</p>
        </div>
    );
}

function AssetTypeCard({
    Icon,
    title,
    description,
    onClick,
    disabled,
}: {
    Icon: LucideIcon;
    title: string;
    description: string;
    onClick: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`w-full p-6 bg-card-bg border-2 border-border-subtle rounded-lg hover:border-primary transition-all text-left group ${
                disabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
        >
            <div className="flex items-start gap-4">
                <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
                        disabled
                            ? "bg-secondary-bg"
                            : "bg-transparent border-2 border-border-subtle group-hover:border-primary group-hover:bg-primary/10"
                    }`}
                >
                    <Icon className={`w-6 h-6 ${disabled ? "text-muted-text" : "text-primary"}`} />
                </div>
                <div className="flex-1 flex flex-col gap-0.5">
                    <h4 className="font-semibold text-lg">{title}</h4>
                    <p className="text-sm text-secondary-text">{description}</p>
                </div>
            </div>
        </button>
    );
}

function InfoList({ items }: { items: string[] }) {
    return (
        <ul className="list-disc list-inside space-y-1 text-foreground/80">
            {items.map((item, idx) => (
                <li key={idx}>{item}</li>
            ))}
        </ul>
    );
}
