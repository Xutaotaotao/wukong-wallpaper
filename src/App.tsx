import "./App.css";

import {
  Button,
  Col,
  Image,
  Modal,
  Row,
  Spin,
  Typography,
  message,
} from "antd";
import { ResponseType, fetch } from "@tauri-apps/api/http";
import { useEffect, useState } from "react";

import { WALLPAPERS } from "./utils/const";
import { invoke } from "@tauri-apps/api/tauri";
import { listen } from "@tauri-apps/api/event";

const { Title } = Typography;

const dataFetchUrl = "https://taotaoxu.com/wukong/data.json";

function App() {
  const [visible, setVisible] = useState(false);
  const [currentImg, setCurrentImg] = useState({
    thumbnail: "",
    preview: "",
  });
  const [loading, setLoading] = useState(true);
  const [tip, setTip] = useState("初始化中...");

  const [wallPapers, setWallPapers] = useState<any[]>([]);

  const handleChangeWallpaper = async (
    item: any,
    index: number,
    showLoading = true
  ) => {
    setTip("设置中...");
    localStorage.setItem("currentIndex", `${index}`);
    if (showLoading) {
      setLoading(true);
    }
    try {
      await invoke("download_and_set_wallpaper", {
        url: item.url,
        fileName: item.file_id,
        wallpapers: wallPapers,
      });
      if (showLoading) {
        message.success("壁纸更改成功!");
      }
    } catch (error) {
      if (showLoading) {
        message.error(`更改壁纸失败: ${error}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = (item: any) => {
    setCurrentImg(item);
    setVisible(true);
  };

  useEffect(() => {
    const changeWallpaperListen = listen("change_wallpaper", (data:any) => {
      const currentIndex = Number(localStorage.getItem("currentIndex")) || 0;
      console.log("currentIndex",currentIndex)
      const { message } = data.payload || {};
      if (message === "next_wallpaper") {
        let indexData = currentIndex + 1;
        if (indexData > wallPapers.length - 1){
          indexData = 0
        }
        if (wallPapers[indexData]) {
          handleChangeWallpaper(wallPapers[indexData], indexData, false);
        } else {
          // 兜底
          handleChangeWallpaper(WALLPAPERS[0], 0, false);
        }
      }
      if (message === "previous_wallpaper") {
        let indexData = currentIndex - 1
        if (indexData < 0){
          indexData = wallPapers.length - 1
        }
        if (wallPapers[indexData]) {
          handleChangeWallpaper(wallPapers[indexData], indexData, false);
        } else {
          handleChangeWallpaper(WALLPAPERS[0], 0, false);
        }
      }
    });

    return () => {
      changeWallpaperListen.then((unlisten) => unlisten());
    };
  }, [wallPapers]);

  useEffect(() => {
    setLoading(true);
    fetch(dataFetchUrl, {
      method: "GET",
      headers: {
        "content-type": "application/json",
      },
      responseType: ResponseType.JSON,
      timeout: 2000,
    })
      .then((res: any) => {
        if (
          res.data &&
          Array.isArray(res.data.wallPapers) &&
          res.data.wallPapers.length
        ) {
          setWallPapers(res.data.wallPapers);
        } else {
          setWallPapers(WALLPAPERS);
        }
      })
      .catch((e) => {
        console.log(e);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="w-full h-full p-1 relative">
      <Row gutter={4} style={{ minHeight: "600px" }}>
        {wallPapers.map((item, index) => (
          <Col key={index} span={8}>
            <div className="relative group">
              <img
                className="rounded w-full"
                src={item.thumbnail}
                alt={item.title}
              />
              <div className="absolute inset-0 bg-black bg-opacity-50 flex justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Button className="mr-2" onClick={() => handlePreview(item)}>
                  预览
                </Button>
                <Button
                  onClick={() => handleChangeWallpaper(item, index, true)}
                >
                  设置壁纸
                </Button>
              </div>
            </div>

            <div className="flex justify-center align-center p-1">
              <Title level={5}>{item.title}</Title>
            </div>
          </Col>
        ))}
      </Row>
      <Modal
        centered
        title={null}
        open={loading}
        footer={null}
        styles={{ body: { padding: 20 } }}
        width={190}
        closeIcon={null}
      >
        <Spin tip={tip}>
          <div className="h-20px"></div>
        </Spin>
      </Modal>
      <Image
        width={200}
        style={{ display: "none" }}
        src={currentImg.thumbnail}
        preview={{
          visible,
          src: currentImg.preview,
          onVisibleChange: (value) => {
            setVisible(value);
          },
        }}
      />
    </div>
  );
}

export default App;
