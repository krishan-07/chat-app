import "react-image-crop/dist/ReactCrop.css";
import React, { useState, useRef, useEffect } from "react";
import ReactCrop, { Crop, PixelCrop } from "react-image-crop";
import { canvasPreview } from "./utlis/canvasPreview";
import { useDebounceEffect } from "../hooks/useDebounceEffect";
import { Button, Modal } from "react-bootstrap";
import { blobUrlToBlob } from "../utils";
import centerAspectCrop from "./utlis/centerAspectCrop";

type Props = {
  show: boolean;
  crop: Crop | undefined;
  imgSrc: string;
  setImgSrc: React.Dispatch<React.SetStateAction<string>>;
  setCrop: React.Dispatch<React.SetStateAction<Crop | undefined>>;
  handleClose: () => void;
};

const ImageCropModal: React.FC<Props> = ({
  show,
  handleClose,
  crop,
  setCrop,
  imgSrc,
  setImgSrc,
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const blobUrlRef = useRef<string>("");
  const previousBlobUrlRef = useRef<Blob>();

  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height));
  };

  const generateImageLink = async (showPrevious: boolean = false) => {
    if (showPrevious && previousBlobUrlRef.current) {
      return previousBlobUrlRef.current;
    }

    const image = imgRef.current;
    const previewCanvas = previewCanvasRef.current;
    if (!image || !previewCanvas || !completedCrop) {
      throw new Error("Crop canvas does not exist");
    }

    // Calculate the scaling factors relative to the uploaded image
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const offscreen = new OffscreenCanvas(
      completedCrop.width * scaleX,
      completedCrop.height * scaleY
    );
    const ctx = offscreen.getContext("2d");
    if (!ctx) {
      throw new Error("No 2d context");
    }

    // Draw the cropped image on the offscreen canvas
    ctx.drawImage(
      previewCanvas,
      0,
      0,
      previewCanvas.width,
      previewCanvas.height,
      0,
      0,
      offscreen.width,
      offscreen.height
    );

    previousBlobUrlRef.current = await blobUrlToBlob(imgSrc);

    // Convert the canvas to a Blob
    const blob = await offscreen.convertToBlob({
      type: "image/png",
    });

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
    }
    blobUrlRef.current = URL.createObjectURL(blob);

    return blobUrlRef.current;
  };

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setScale((prevScale) => Math.min(prevScale + 0.1, 3));
    } else if (e.deltaY > 0) {
      setScale((prevScale) => Math.max(prevScale - 0.1, 0.1));
    }
  };

  useDebounceEffect(
    async () => {
      if (
        completedCrop?.width &&
        completedCrop?.height &&
        imgRef.current &&
        previewCanvasRef.current
      ) {
        canvasPreview(
          imgRef.current,
          previewCanvasRef.current,
          completedCrop,
          scale
        );
      }
    },
    100,
    [completedCrop, scale]
  );

  useEffect(() => {
    const imgElement = imgRef.current;

    const onMouseEnter = () => {
      if (imgElement) {
        imgElement.addEventListener("wheel", handleWheel);
      }
    };

    const onMouseLeave = () => {
      if (imgElement) {
        imgElement.removeEventListener("wheel", handleWheel);
      }
    };

    if (imgElement) {
      imgElement.addEventListener("mouseenter", onMouseEnter);
      imgElement.addEventListener("mouseleave", onMouseLeave);
    }

    return () => {
      if (imgElement) {
        imgElement.removeEventListener("mouseenter", onMouseEnter);
        imgElement.removeEventListener("mouseleave", onMouseLeave);
      }
    };
  }, [imgSrc]);

  return (
    <Modal show={show} onHide={handleClose} backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>Crop image</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {!!imgSrc && (
          <div className="center" style={{ background: "black" }}>
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={1}
              minWidth={100}
              minHeight={100}
            >
              <img
                ref={imgRef}
                src={imgSrc}
                style={{
                  transform: `scale(${scale})`,
                  maxWidth: "100%",
                  maxHeight: "70vh",
                }}
                className="center"
                onLoad={onImageLoad}
                alt="Crop me"
              />
            </ReactCrop>
          </div>
        )}
        {!!completedCrop && (
          <>
            <div className="d-none">
              <canvas
                ref={previewCanvasRef}
                style={{
                  border: "1px solid black",
                  objectFit: "contain",
                  width: completedCrop.width,
                  height: completedCrop.height,
                }}
              />
            </div>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="secondary"
          onClick={() => {
            handleClose();
            setImgSrc("");
          }}
        >
          Close
        </Button>
        <Button
          variant="secondary"
          onClick={async () => {
            const imageLink = await generateImageLink();
            if (typeof imageLink === "string") {
              setImgSrc(imageLink);
            }
          }}
        >
          Zoom
        </Button>
        <Button
          variant="secondary"
          disabled={!previousBlobUrlRef.current}
          onClick={async () => {
            const imageLink = await generateImageLink(true);
            if (imageLink instanceof Blob) {
              setImgSrc(URL.createObjectURL(imageLink));
            }
          }}
        >
          previous
        </Button>
        <Button
          variant="primary"
          onClick={async () => {
            const imageLink = await generateImageLink();
            if (typeof imageLink === "string") {
              setImgSrc(imageLink);
            }
            previousBlobUrlRef.current = undefined;
            handleClose();
          }}
        >
          Save changes
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ImageCropModal;
