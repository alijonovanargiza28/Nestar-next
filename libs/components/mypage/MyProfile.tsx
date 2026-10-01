import React, { useCallback, useEffect, useState } from 'react';
import { NextPage } from 'next';
import useDeviceDetect from '../../hooks/useDeviceDetect';
import { Button, Stack, Typography } from '@mui/material';
import axios from 'axios';

import { Messages, REACT_APP_API_GRAPHQL_URL, REACT_APP_API_URL } from '../../config';

import { getJwtToken } from '../../auth';

import { useMutation, useReactiveVar } from '@apollo/client';
import { userVar } from '../../../apollo/store';

import { MemberUpdate } from '../../types/member/member.update';

import { sweetErrorHandling, sweetMixinSuccessAlert } from '../../sweetAlert';

import { UPDATE_MEMBER } from '../../../apollo/user/mutation';

const MyProfile: NextPage = ({ initialValues }: any) => {
	const device = useDeviceDetect();

	// JWT token
	const token = getJwtToken();

	// Current logged-in user
	const user = useReactiveVar(userVar);

	// Profile update data
	const [updateData, setUpdateData] = useState<MemberUpdate>(initialValues);

	/** APOLLO REQUESTS **/

	const [updateMember] = useMutation(UPDATE_MEMBER);

	/** LIFECYCLES **/

	useEffect(() => {
		if (!user) return;

		setUpdateData((prev) => ({
			...prev,

			memberNick: user.memberNick || '',
			memberPhone: user.memberPhone || '',
			memberAddress: user.memberAddress || '',

			// IMPORTANT:
			// Agar yangi upload qilingan image mavjud bo'lsa,
			// eski user.memberImage uni bosib ketmaydi.
			memberImage: prev.memberImage || user.memberImage || '',
		}));
	}, [user]);

	/** HANDLERS **/

	const uploadImage = async (e: any) => {
		try {
			const image = e.target.files?.[0];

			if (!image) return;

			console.log('==============================');
			console.log('SELECTED IMAGE:', image);
			console.log('IMAGE NAME:', image.name);
			console.log('IMAGE TYPE:', image.type);
			console.log('IMAGE SIZE:', image.size);
			console.log('==============================');

			// File type check
			const allowedTypes = ['image/jpg', 'image/jpeg', 'image/png'];

			if (!allowedTypes.includes(image.type)) {
				throw new Error('Only JPG, JPEG or PNG images are allowed.');
			}

			const formData = new FormData();

			/** GRAPHQL OPERATIONS **/

			formData.append(
				'operations',
				JSON.stringify({
					query: `
						mutation ImageUploader(
							$file: Upload!,
							$target: String!
						) {
							imageUploader(
								file: $file,
								target: $target
							)
						}
					`,
					variables: {
						file: null,
						target: 'member',
					},
				}),
			);

			/** GRAPHQL MAP **/

			formData.append(
				'map',
				JSON.stringify({
					'0': ['variables.file'],
				}),
			);

			/** FILE **/

			formData.append('0', image);

			console.log('UPLOADING MEMBER IMAGE...');

			/** REQUEST **/

			const response = await axios.post(REACT_APP_API_GRAPHQL_URL, formData, {
				headers: {
					'Content-Type': 'multipart/form-data',

					'apollo-require-preflight': true,

					Authorization: `Bearer ${token}`,
				},
			});

			console.log('UPLOAD RESPONSE:', response.data);

			/** GRAPHQL ERROR CHECK **/

			if (response.data?.errors && response.data.errors.length > 0) {
				throw new Error(response.data.errors[0]?.message || 'Image upload failed.');
			}

			/** IMAGE PATH **/

			const responseImage = response.data?.data?.imageUploader;

			console.log('UPLOADED IMAGE PATH:', responseImage);

			if (!responseImage) {
				throw new Error('Image upload failed: no image path returned.');
			}

			/**
			 * IMPORTANT
			 *
			 * Backenddan kelgan yangi image path
			 * darhol state'ga yoziladi.
			 *
			 * Masalan:
			 * uploads/member/abc.jpg
			 */

			setUpdateData((prev) => ({
				...prev,
				memberImage: responseImage,
			}));

			console.log('NEW UPDATE DATA IMAGE:', responseImage);

			// Inputni reset qilamiz.
			// Keyin aynan shu rasmni yana tanlash mumkin.
			e.target.value = '';

			console.log('MEMBER IMAGE UPDATED SUCCESSFULLY');
		} catch (err: any) {
			console.log('ERROR, uploadImage:', err);

			await sweetErrorHandling(err);
		}
	};

	/** UPDATE PROFILE **/

	const updatePropertyHandler = useCallback(async () => {
		try {
			// User ID mavjudligini tekshiramiz
			if (!user?._id) {
				throw new Error(Messages.error2);
			}

			// Backendga yuboriladigan data
			const inputData = {
				...updateData,
				_id: user._id,
			};

			console.log('==============================');

			console.log('UPDATE MEMBER INPUT:', inputData);

			console.log('MEMBER IMAGE:', inputData.memberImage);

			console.log('==============================');

			/** UPDATE_MEMBER **/

			const result = await updateMember({
				variables: {
					input: inputData,
				},
			});

			console.log('UPDATE_MEMBER RESULT:', result.data?.updateMember);

			/**
			 * UPDATE_MEMBER mutation
			 * accessToken qaytarmasa,
			 * tokenni bu yerda o'zgartirmaymiz.
			 */

			await sweetMixinSuccessAlert('Information updated successfully.');
		} catch (err: any) {
			console.log('ERROR, updateMember:', err);

			await sweetErrorHandling(err);
		}
	}, [updateData, user?._id, updateMember]);

	/** DISABLED CHECK **/

	const doDisabledCheck = () => {
		if (!updateData.memberNick || !updateData.memberPhone || !updateData.memberAddress || !updateData.memberImage) {
			return true;
		}

		return false;
	};

	console.log('CURRENT UPDATE DATA:', updateData);

	/** MOBILE **/

	if (device === 'mobile') {
		return <>MY PROFILE PAGE MOBILE</>;
	}

	/** IMAGE URL **/

	const memberImageUrl = updateData?.memberImage
		? `${REACT_APP_API_URL}/${updateData.memberImage.replace(/^\/+/, '')}`
		: '/img/profile/defaultUser.svg';

	console.log('MEMBER IMAGE URL:', memberImageUrl);

	/** DESKTOP **/

	return (
		<div id="my-profile-page">
			{/* TITLE */}

			<Stack className="main-title-box">
				<Stack className="right-box">
					<Typography className="main-title">My Profile</Typography>

					<Typography className="sub-title">We are glad to see you again!</Typography>
				</Stack>
			</Stack>

			{/* PROFILE */}

			<Stack className="top-box">
				{/* PHOTO */}

				<Stack className="photo-box">
					<Typography className="title">Photo</Typography>

					<Stack className="image-big-box">
						<Stack className="image-box">
							<img src={memberImageUrl} alt="Profile" />
						</Stack>

						<Stack className="upload-big-box">
							<input
								type="file"
								hidden
								id="hidden-input"
								onChange={uploadImage}
								accept="image/jpg, image/jpeg, image/png"
							/>

							<label htmlFor="hidden-input" className="labeler">
								<Typography>Upload Profile Image</Typography>
							</label>

							<Typography className="upload-text">A photo must be in JPG, JPEG or PNG format!</Typography>
						</Stack>
					</Stack>
				</Stack>

				{/* USERNAME + PHONE */}

				<Stack className="small-input-box">
					<Stack className="input-box">
						<Typography className="title">Username</Typography>

						<input
							type="text"
							placeholder="Your username"
							value={updateData.memberNick}
							onChange={({ target: { value } }) =>
								setUpdateData((prev) => ({
									...prev,
									memberNick: value,
								}))
							}
						/>
					</Stack>

					<Stack className="input-box">
						<Typography className="title">Phone</Typography>

						<input
							type="text"
							placeholder="Your Phone"
							value={updateData.memberPhone}
							onChange={({ target: { value } }) =>
								setUpdateData((prev) => ({
									...prev,
									memberPhone: value,
								}))
							}
						/>
					</Stack>
				</Stack>

				{/* ADDRESS */}

				<Stack className="address-box">
					<Typography className="title">Address</Typography>

					<input
						type="text"
						placeholder="Your address"
						value={updateData.memberAddress}
						onChange={({ target: { value } }) =>
							setUpdateData((prev) => ({
								...prev,
								memberAddress: value,
							}))
						}
					/>
				</Stack>

				{/* UPDATE BUTTON */}

				<Stack className="about-me-box">
					<Button className="update-button" onClick={updatePropertyHandler} disabled={doDisabledCheck()}>
						<Typography>Update Profile</Typography>

						<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 13 13" fill="none">
							<g clipPath="url(#clip0_7065_6985)">
								<path
									d="M12.6389 0H4.69446C4.49486 0 4.33334 0.161518 4.33334 0.361122C4.33334 0.560727 4.49486 0.722245 4.69446 0.722245H11.7672L0.105803 12.3836C-0.0352676 12.5247 -0.0352676 12.7532 0.105803 12.8942C0.176321 12.9647 0.268743 13 0.361131 13C0.453519 13 0.545907 12.9647 0.616459 12.8942L12.2778 1.23287V8.30558C12.2778 8.50518 12.4393 8.6667 12.6389 8.6667C12.8385 8.6667 13 8.50518 13 8.30558V0.361122C13 0.161518 12.8385 0 12.6389 0Z"
									fill="white"
								/>
							</g>

							<defs>
								<clipPath id="clip0_7065_6985">
									<rect width="13" height="13" fill="white" />
								</clipPath>
							</defs>
						</svg>
					</Button>
				</Stack>
			</Stack>
		</div>
	);
};

MyProfile.defaultProps = {
	initialValues: {
		_id: '',
		memberImage: '',
		memberNick: '',
		memberPhone: '',
		memberAddress: '',
	},
};

export default MyProfile;
