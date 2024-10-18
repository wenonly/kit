import torch
import torchvision
import torchvision.transforms as transforms
import matplotlib.pyplot as plt
import numpy as np
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
import gradio as gr
from PIL import Image


# 加载数据
def load_data():
    transform = transforms.Compose(
        [transforms.ToTensor(), transforms.Normalize((0.5,), (0.5,))]
    )

    trainset = torchvision.datasets.EMNIST(
        root="./data", train=True, download=True, transform=transform, split="mnist"
    )
    trainloader = torch.utils.data.DataLoader(trainset, batch_size=4, shuffle=True)

    testset = torchvision.datasets.EMNIST(
        root="./data", train=False, download=True, transform=transform, split="mnist"
    )
    testloader = torch.utils.data.DataLoader(
        testset, batch_size=4, shuffle=False, num_workers=2
    )
    return trainloader, testloader


# 显示图像
def imshow(images, labels):
    img = torchvision.utils.make_grid(images)
    img = img / 2 + 0.5  # 反归一化
    npimg = img.numpy()
    plt.figure(figsize=(10, 5))
    plt.imshow(np.transpose(npimg, (1, 2, 0)))
    plt.title(
        "label: " + " ".join("%5s" % labels[j].item() for j in range(len(labels)))
    )
    plt.axis("off")
    plt.show()


# 定义网络
class Net(nn.Module):
    def __init__(self):
        super(Net, self).__init__()
        self.conv1 = nn.Conv2d(1, 6, 5)
        self.pool = nn.MaxPool2d(2, 2)
        self.conv2 = nn.Conv2d(6, 16, 5)
        self.fc1 = nn.Linear(16 * 4 * 4, 120)
        self.fc2 = nn.Linear(120, 84)
        self.fc3 = nn.Linear(84, 10)

    def forward(self, x):
        x = self.pool(F.relu(self.conv1(x)))
        x = self.pool(F.relu(self.conv2(x)))
        x = x.view(-1, 16 * 4 * 4)
        x = F.relu(self.fc1(x))
        x = F.relu(self.fc2(x))
        x = self.fc3(x)
        return x


def train(net, trainloader):
    # 定义损失函数和优化器
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.SGD(net.parameters(), lr=0.001, momentum=0.9)
    # 训练网络
    for epoch in range(2):  # 多次循环遍历数据集

        running_loss = 0.0  # 初始化损失
        for i, data in enumerate(trainloader, 0):
            # 获取输入
            inputs, labels = data

            # 梯度清零
            optimizer.zero_grad()

            # 前向传播
            outputs = net(inputs)
            loss = criterion(outputs, labels)

            # 反向传播
            loss.backward()
            optimizer.step()

            # 计算损失
            running_loss += loss.item()  # 累加是为了之后取平均

            if i % 2000 == 1999:  # 每2000个批次打印一次
                print(f"[{epoch + 1}, {i + 1}] loss: {running_loss / 2000:.3f}")
                running_loss = 0.0

    print("Finished Training")


def test(net, testloader):
    correct = 0
    total = 0
    with torch.no_grad():
        for data in testloader:
            images, labels = data
            outputs = net(images)
            _, predicted = torch.max(outputs.data, 1)
            total += labels.size(0)
            correct += (predicted == labels).sum().item()

    print(
        f"Accuracy of the network on the 10000 test images: {100 * correct / total:.2f}%"
    )


def train_and_test(trainloader, testloader):
    net = Net()
    train(net, trainloader)
    test(net, testloader)
    return net


if __name__ == "__main__":
    net = Net()
    # 加载数据
    trainloader, testloader = load_data()
    # # 训练和测试
    # train(net, trainloader)
    # test(net, testloader)
    # # 保存模型
    # torch.save(net.state_dict(), "./model.pth")

    # 加载模型
    net = Net()
    net.load_state_dict(torch.load("./model.pth"))
    net.eval()

    # # 获取一些测试图像
    # dataiter = iter(testloader)
    # images, labels = next(dataiter)

    # # 预测结果
    # outputs = net(images)
    # _, predicted = torch.max(outputs, 1)

    # imshow(images, predicted)

    # 创建Gradio界面
    def predict_digit(image):
        preImage = image["layers"][0]
        rgb_image = Image.new("RGB", preImage.size, (255, 255, 255))
        rgb_image.paste(preImage, mask=preImage.split()[3])
        # 预处理图像
        transform = transforms.Compose(
            [
                transforms.Grayscale(),
                transforms.Resize((28, 28)),
                transforms.RandomHorizontalFlip(p=1),  # 左右镜像翻转
                transforms.Lambda(
                    lambda x: x.rotate(90, expand=True)
                ),  # 逆时针旋转90度
                transforms.ToTensor(),
                transforms.Lambda(lambda x: 1 - x),
                transforms.Normalize((0.5,), (0.5,)),
            ]
        )
        processed_image = transform(rgb_image).unsqueeze(0)
        # 将处理后的图像转换回PIL图像以显示
        processed_pil = transforms.ToPILImage()(processed_image.squeeze(0))

        with torch.no_grad():
            output = net(processed_image)
            _, predicted = torch.max(output, 1)
        print(f"预测结果: {predicted.item()}")
        return preImage, processed_pil, f"预测结果: {predicted.item()}"

    iface = gr.Interface(
        fn=predict_digit,
        inputs=gr.Sketchpad(
            type="pil", brush=gr.Brush(default_size=30, default_color="#000000")
        ),
        outputs=[
            gr.Image(type="pil", label="处理前的图像", width=280, height=280),
            gr.Image(type="pil", label="处理后的图像", width=280, height=280),
            "text",
        ],
        live=True,
        title="手写数字识别",
        description="在画板上绘制一个数字，模型将显示处理后的图像并给出预测结果。",
    )
    iface.launch()
