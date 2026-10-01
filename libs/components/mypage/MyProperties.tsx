import React, { useEffect, useState } from 'react';
import { NextPage } from 'next';
import { Pagination, Stack, Typography } from '@mui/material';
import useDeviceDetect from '../../hooks/useDeviceDetect';
import { PropertyCard } from './PropertyCard';
import { useMutation, useQuery, useReactiveVar } from '@apollo/client';
import { Property } from '../../types/property/property';
import { AgentPropertiesInquiry } from '../../types/property/property.input';
import { T } from '../../types/common';
import { PropertyStatus } from '../../enums/property.enum';
import { userVar } from '../../../apollo/store';
import { useRouter } from 'next/router';
import { UPDATE_PROPERTY } from '../../../apollo/user/mutation';
import { GET_AGENT_PROPERTIES } from '../../../apollo/user/query';
import { sweetConfirmAlert, sweetErrorHandling } from '../../sweetAlert';

const MyProperties: NextPage = ({ initialInput, ...props }: any) => {
	const device = useDeviceDetect();
	const router = useRouter();
	const user = useReactiveVar(userVar);

	const [searchFilter, setSearchFilter] = useState<AgentPropertiesInquiry>(initialInput);

	const [agentProperties, setAgentProperties] = useState<Property[]>([]);

	const [total, setTotal] = useState<number>(0);

	/** APOLLO REQUESTS **/

	const [updateProperty] = useMutation(UPDATE_PROPERTY);

	const {
		loading: getAgentPropertiesLoading,
		data: getAgentPropertiesData,
		error: getAgentPropertiesError,
		refetch: getAgentPropertiesRefetch,
	} = useQuery(GET_AGENT_PROPERTIES, {
		fetchPolicy: 'network-only',

		variables: {
			input: searchFilter,
		},

		notifyOnNetworkStatusChange: true,

		onCompleted: (data: T) => {
			console.log('GET_AGENT_PROPERTIES DATA:', data);

			// IMPORTANT:
			// Backend query name = getAgentProperties
			const properties = data?.getAgentProperties?.list ?? [];

			const totalCount = data?.getAgentProperties?.metaCounter?.[0]?.total ?? 0;

			console.log('AGENT PROPERTIES:', properties);
			console.log('TOTAL:', totalCount);

			setAgentProperties(properties);
			setTotal(totalCount);
		},

		onError: (error) => {
			console.log('GET_AGENT_PROPERTIES ERROR:', error);

			setAgentProperties([]);
			setTotal(0);
		},
	});

	/** CHECK USER TYPE **/

	useEffect(() => {
		if (user && user.memberType !== 'AGENT') {
			router.back();
		}
	}, [user, router]);

	/** HANDLERS **/

	const paginationHandler = (e: T, value: number) => {
		setSearchFilter((prev) => ({
			...prev,
			page: value,
		}));
	};

	const changeStatusHandler = (value: PropertyStatus) => {
		setSearchFilter((prev) => ({
			...prev,
			page: 1,

			search: {
				...prev.search,
				propertyStatus: value,
			},
		}));
	};

	/** DELETE PROPERTY **/

	const deletePropertyHandler = async (id: string) => {
		try {
			const confirmed = await sweetConfirmAlert('Are you sure to delete this property?');

			if (!confirmed) return;

			await updateProperty({
				variables: {
					input: {
						_id: id,
						propertyStatus: PropertyStatus.DELETE,
					},
				},
			});

			// IMPORTANT:
			// refetch variables format
			await getAgentPropertiesRefetch({
				input: searchFilter,
			});
		} catch (err: any) {
			await sweetErrorHandling(err);
		}
	};

	/** UPDATE PROPERTY STATUS **/

	const updatePropertyHandler = async (status: string, id: string) => {
		try {
			const confirmed = await sweetConfirmAlert(`Are you sure you want to change to ${status} status?`);

			if (!confirmed) return;

			await updateProperty({
				variables: {
					input: {
						_id: id,
						propertyStatus: status,
					},
				},
			});

			// IMPORTANT:
			// refetch variables format
			await getAgentPropertiesRefetch({
				input: searchFilter,
			});
		} catch (err: any) {
			await sweetErrorHandling(err);
		}
	};

	/** MOBILE **/

	if (device === 'mobile') {
		return <div>NESTAR PROPERTIES MOBILE</div>;
	}

	/** DATA **/

	const properties = agentProperties ?? [];

	const pageCount = searchFilter?.limit > 0 ? Math.ceil(total / searchFilter.limit) : 0;

	/** DESKTOP **/

	return (
		<div id="my-property-page">
			<Stack className="main-title-box">
				<Stack className="right-box">
					<Typography className="main-title">My Properties</Typography>

					<Typography className="sub-title">We are glad to see you again!</Typography>
				</Stack>
			</Stack>

			<Stack className="property-list-box">
				<Stack className="tab-name-box">
					<Typography
						onClick={() => changeStatusHandler(PropertyStatus.ACTIVE)}
						className={searchFilter?.search?.propertyStatus === PropertyStatus.ACTIVE ? 'active-tab-name' : 'tab-name'}
					>
						On Sale
					</Typography>

					<Typography
						onClick={() => changeStatusHandler(PropertyStatus.SOLD)}
						className={searchFilter?.search?.propertyStatus === PropertyStatus.SOLD ? 'active-tab-name' : 'tab-name'}
					>
						On Sold
					</Typography>
				</Stack>

				<Stack className="list-box">
					<Stack className="listing-title-box">
						<Typography className="title-text">Listing title</Typography>

						<Typography className="title-text">Date Published</Typography>

						<Typography className="title-text">Status</Typography>

						<Typography className="title-text">View</Typography>

						{searchFilter?.search?.propertyStatus === PropertyStatus.ACTIVE && (
							<Typography className="title-text">Action</Typography>
						)}
					</Stack>

					{/* PROPERTY LIST */}

					{properties.length === 0 ? (
						<div className="no-data">
							<img src="/img/icons/icoAlert.svg" alt="No property" />

							<p>No Property found!</p>
						</div>
					) : (
						properties.map((property: Property) => (
							<PropertyCard
								key={property._id}
								property={property}
								deletePropertyHandler={deletePropertyHandler}
								updatePropertyHandler={updatePropertyHandler}
							/>
						))
					)}

					{/* PAGINATION */}

					{properties.length !== 0 && (
						<Stack className="pagination-config">
							<Stack className="pagination-box">
								<Pagination
									count={pageCount}
									page={searchFilter.page}
									shape="circular"
									color="primary"
									onChange={paginationHandler}
								/>
							</Stack>

							<Stack className="total-result">
								<Typography>
									{total} {total === 1 ? 'property' : 'properties'} available
								</Typography>
							</Stack>
						</Stack>
					)}
				</Stack>
			</Stack>
		</div>
	);
};

MyProperties.defaultProps = {
	initialInput: {
		page: 1,
		limit: 5,
		sort: 'createdAt',

		search: {
			propertyStatus: PropertyStatus.ACTIVE,
		},
	},
};

export default MyProperties;
