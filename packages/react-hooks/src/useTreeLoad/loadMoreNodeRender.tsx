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
        href="javascript:void(0);"
        style={{
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          overflow: "hidden",
          color: "gray",
          textDecoration: "none",
        }}
      >
        没有更多
      </a>
    );
  }
  return (
    <a
      href="javascript:void(0);"
      style={{
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        overflow: "hidden",
        textDecoration: "none",
      }}
    >
      加载更多
    </a>
  );
};

export default loadMoreNodeRender;
