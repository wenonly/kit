import { LoadingOutlined } from "@ant-design/icons";

const loadMoreNodeRender = (status: "loading" | "complete" | "waitLoad") => {
  if (status === "loading") {
    return (
      <div>
        <LoadingOutlined />
      </div>
    );
  }
  if (status === "complete") {
    return (
      <a
        style={{
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          overflow: "hidden",
          color: "gray",
        }}
      >
        没有更多
      </a>
    );
  }
  return <a>加载更多</a>;
};

export default loadMoreNodeRender;
