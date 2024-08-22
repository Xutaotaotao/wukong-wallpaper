import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { Row, Col, Typography, Button,Image, message } from "antd";
import { listen } from "@tauri-apps/api/event";
import { WALLPAPERS } from "./utils/const";
import "./App.css";

const { Title } = Typography;

let currentIndex = 0

function App() {
  const [visible, setVisible] = useState(false);
  const [currentImg,setCurrentImg] = useState({
    thumbnail:'',
    preview: ''
  });

  const handleChangeWallpaper = async (item:any,index:number) => {
    currentIndex = index;
    // setLoading(true);
    try {
      // 调用后端保存图片并设置壁纸
      await invoke('download_and_set_wallpaper', {
        url: item.url,
        fileName: item.file_id,
        wallpapers: WALLPAPERS
      });
      message.success('壁纸更改成功!');
    } catch (error) {
      message.error(`更改壁纸失败: ${error}`);
    } finally {
      // setLoading(false);
    }
  };

  const handlePreview = (item:any) => {
    setCurrentImg(item)
    setVisible(true);
  };

  useEffect(() => {
    const unlistenNext = listen("next_wallpaper", () => {
      const indexData = currentIndex === WALLPAPERS.length - 1 ? 0 : currentIndex + 1;
      console.log(indexData);
      handleChangeWallpaper(WALLPAPERS[indexData],indexData);
    });
    const unlistenPrevious = listen("previous_wallpaper", () => {
      const indexData = currentIndex === 0 ? WALLPAPERS.length - 1 : currentIndex - 1;
      handleChangeWallpaper(WALLPAPERS[indexData],indexData);
    });

    return () => {
      unlistenNext.then((f) => f());
      unlistenPrevious.then((f) => f());
    };
  }, []);

  return (
    <div className="w-full h-full p-1">
      <Row gutter={4}>
        {WALLPAPERS.map((item, index) => (
          <Col key={index} span={8}>
            <div className="relative group">
              <img
                className="rounded w-full"
                src={item.thumbnail}
                alt={item.title}
              />
              <div className="absolute inset-0 bg-black bg-opacity-50 flex justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Button className="mr-2" onClick={() => handlePreview(item)}>预览</Button>
                <Button onClick={() => handleChangeWallpaper(item,index)}>设置壁纸</Button>
              </div>
            </div>

            <div className="flex justify-center align-center p-1">
              <Title level={5}>{item.title}</Title>
            </div>
          </Col>
        ))}
      </Row>
      <Image
        width={200}
        style={{ display: 'none' }}
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
